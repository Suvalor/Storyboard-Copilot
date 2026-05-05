use reqwest::Client;
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{sleep, Duration};
use tracing::info;

use crate::ai::error::AIError;
use crate::ai::{
    AIProvider, GenerateRequest, ProviderTaskHandle, ProviderTaskPollResult, ProviderTaskSubmission,
};

const MAAS_API_BASE_URL: &str = "https://maas-coding-api.cn-huabei-1.xf-yun.com";
const SUBMIT_PATH: &str = "/v1/images/generations";
const RESULT_PATH: &str = "/v1/images/generations/result";
const POLL_INTERVAL_MS: u64 = 2000;

#[derive(Debug, Deserialize)]
struct MaasSubmitResponse {
    code: Option<i64>,
    message: Option<String>,
    data: Option<MaasSubmitData>,
}

#[derive(Debug, Deserialize)]
struct MaasSubmitData {
    task_id: Option<String>,
    #[allow(dead_code)]
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MaasResultResponse {
    code: Option<i64>,
    message: Option<String>,
    data: Option<MaasResultData>,
}

#[derive(Debug, Deserialize)]
struct MaasResultData {
    status: Option<String>,
    results: Option<Vec<MaasResultItem>>,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MaasResultItem {
    url: Option<String>,
}

pub struct MaasProvider {
    client: Client,
    api_key: Arc<RwLock<Option<String>>>,
}

impl MaasProvider {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            api_key: Arc::new(RwLock::new(None)),
        }
    }

    fn sanitize_model(model: &str) -> String {
        model
            .split_once('/')
            .map(|(_, bare)| bare.to_string())
            .unwrap_or_else(|| model.to_string())
    }

    fn extract_result_url(data: &MaasResultData) -> Option<String> {
        data.results
            .as_ref()
            .and_then(|results| results.first())
            .and_then(|item| item.url.as_ref())
            .filter(|url| !url.trim().is_empty())
            .map(|url| url.to_string())
    }
}

impl Default for MaasProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl AIProvider for MaasProvider {
    fn name(&self) -> &str {
        "maas"
    }

    fn supports_model(&self, model: &str) -> bool {
        matches!(
            Self::sanitize_model(model).as_str(),
            "astron-code-latest"
        )
    }

    fn list_models(&self) -> Vec<String> {
        vec!["maas/astron-code-latest".to_string()]
    }

    async fn set_api_key(&self, api_key: String) -> Result<(), AIError> {
        let mut key = self.api_key.write().await;
        *key = Some(api_key);
        Ok(())
    }

    fn supports_task_resume(&self) -> bool {
        true
    }

    async fn submit_task(&self, request: GenerateRequest) -> Result<ProviderTaskSubmission, AIError> {
        let api_key = self
            .api_key
            .read()
            .await
            .clone()
            .ok_or_else(|| AIError::InvalidRequest("API key not set".to_string()))?;

        let model = Self::sanitize_model(&request.model);
        let endpoint = format!("{}{}", MAAS_API_BASE_URL, SUBMIT_PATH);

        let mut body = json!({
            "model": model,
            "prompt": request.prompt,
            "width": request.size,
            "height": request.size,
            "ratio": request.aspect_ratio,
        });

        if let Some(ref_images) = request.reference_images.as_ref().filter(|imgs| !imgs.is_empty()) {
            body["image"] = json!(ref_images[0]);
        }

        info!(
            "[MAAS Request] model: {}, size: {}, aspect_ratio: {}",
            model, request.size, request.aspect_ratio
        );

        let response = self
            .client
            .post(&endpoint)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AIError::Provider(format!(
                "MAAS submit failed {}: {}",
                status, error_text
            )));
        }

        let raw = response.text().await.unwrap_or_default();
        let submit_body = serde_json::from_str::<MaasSubmitResponse>(&raw).map_err(|err| {
            AIError::Provider(format!(
                "MAAS submit invalid JSON response: {}; raw={}",
                err, raw
            ))
        })?;

        if let Some(code) = submit_body.code {
            if code != 0 {
                let msg = submit_body
                    .message
                    .unwrap_or_else(|| "unknown error".to_string());
                return Err(AIError::Provider(format!("MAAS submit error code {}: {}", code, msg)));
            }
        }

        let data = submit_body.data.ok_or_else(|| {
            AIError::Provider("MAAS submit response missing data field".to_string())
        })?;

        let task_id = data.task_id.ok_or_else(|| {
            AIError::Provider("MAAS submit response missing task_id".to_string())
        })?;

        Ok(ProviderTaskSubmission::Queued(ProviderTaskHandle {
            task_id,
            metadata: None,
        }))
    }

    async fn poll_task(&self, handle: ProviderTaskHandle) -> Result<ProviderTaskPollResult, AIError> {
        let api_key = self
            .api_key
            .read()
            .await
            .clone()
            .ok_or_else(|| AIError::InvalidRequest("API key not set".to_string()))?;

        let endpoint = format!("{}{}", MAAS_API_BASE_URL, RESULT_PATH);
        let response = self
            .client
            .get(&endpoint)
            .header("Authorization", format!("Bearer {}", api_key))
            .query(&[("taskId", handle.task_id.as_str())])
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AIError::Provider(format!(
                "MAAS poll failed {}: {}",
                status, error_text
            )));
        }

        let raw = response.text().await.unwrap_or_default();
        let result_body = serde_json::from_str::<MaasResultResponse>(&raw).map_err(|err| {
            AIError::Provider(format!(
                "MAAS poll invalid JSON response: {}; raw={}",
                err, raw
            ))
        })?;

        if let Some(code) = result_body.code {
            if code != 0 {
                let msg = result_body
                    .message
                    .unwrap_or_else(|| "unknown error".to_string());
                return Err(AIError::Provider(format!("MAAS poll error code {}: {}", code, msg)));
            }
        }

        let data = result_body.data.ok_or_else(|| {
            AIError::Provider("MAAS poll response missing data field".to_string())
        })?;

        if let Some(url) = Self::extract_result_url(&data) {
            return Ok(ProviderTaskPollResult::Succeeded(url));
        }

        match data.status.as_deref() {
            Some("running") | Some("pending") | Some("processing") | None => {
                Ok(ProviderTaskPollResult::Running)
            }
            Some("failed") | Some("error") => {
                let reason = data
                    .error
                    .unwrap_or_else(|| "unknown failure".to_string());
                Ok(ProviderTaskPollResult::Failed(reason))
            }
            Some(other) => Err(AIError::Provider(format!(
                "MAAS unexpected task status: {}",
                other
            ))),
        }
    }

    async fn generate(&self, request: GenerateRequest) -> Result<String, AIError> {
        let submitted = self.submit_task(request).await?;
        let handle = match submitted {
            ProviderTaskSubmission::Succeeded(result) => return Ok(result),
            ProviderTaskSubmission::Queued(handle) => handle,
        };
        loop {
            match self.poll_task(handle.clone()).await? {
                ProviderTaskPollResult::Running => {
                    sleep(Duration::from_millis(POLL_INTERVAL_MS)).await;
                }
                ProviderTaskPollResult::Succeeded(url) => return Ok(url),
                ProviderTaskPollResult::Failed(message) => return Err(AIError::TaskFailed(message)),
            }
        }
    }
}
