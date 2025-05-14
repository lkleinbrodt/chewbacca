from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()


class OpenRouterClient:
    """
    A reusable, extensible, and modular class for handling LLM interactions
    via OpenRouter. Supports both standard multi-message chat format as well
    as single-input requests.
    """

    def __init__(
        self,
        base_url: str = "https://openrouter.ai/api/v1",
        default_model: str = "meta-llama/llama-3.3-70b-instruct",
        api_key: str = os.getenv("OPENROUTER_API_KEY"),
    ):

        self.model = default_model
        self.api_key = api_key
        self.base_url = base_url

        if not self.api_key:
            raise ValueError(
                "No API key provided, and OPENROUTER_API_KEY is not set in the environment"
            )

        self._client = OpenAI(
            base_url=self.base_url,
            api_key=self.api_key,
        )

    def chat(self, messages, model: str = None, stream: bool = False, **kwargs) -> str:
        """
        Send a list of messages in the standard chat format:
        messages = [
            {"role": "system", "content": "..."},
            {"role": "user", "content": "..."},
            ...
        ]
        Optionally override the default model or pass additional kwargs.
        """
        model_to_use = model or self.model

        completion = self._client.chat.completions.create(
            model=model_to_use, messages=messages, stream=stream, **kwargs
        )

        if stream:
            return completion
        else:
            return completion.choices[0].message.content

    def complete(self, prompt: str, model: str = None, **kwargs) -> str:
        """
        Send a single text prompt and get a response. Internally, we wrap it
        into a chat-like format with a single user message.
        """
        messages = [{"role": "user", "content": prompt}]
        return self.chat(messages, model=model, **kwargs)
