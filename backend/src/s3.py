from io import BytesIO
import boto3
from ..config import Config
import json
import s3fs
from llama_index.core import VectorStoreIndex


def create_s3_client() -> boto3.client:
    s3 = boto3.client(
        "s3",
        aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY,
    )
    return s3


def create_s3_fs() -> s3fs.S3FileSystem:
    s3 = s3fs.S3FileSystem(
        key=Config.AWS_ACCESS_KEY_ID,
        secret=Config.AWS_SECRET_ACCESS_KEY,
        client_kwargs={"region_name": "us-west-1"},  # TODO: make this configurable
        # TODO: should we specify bucket? this would have downstream consequences
    )
    return s3


class S3:

    def __init__(self, bucket):
        self.client = create_s3_client()
        self.fs = create_s3_fs()
        self.bucket = bucket

    def load_csv(self, path):
        import pandas as pd

        s3_object = self.client.get_object(Bucket=self.bucket, Key=path)
        contents = s3_object["Body"].read()
        df = pd.read_csv(BytesIO(contents))
        return df

    def download_file(self, s3_path, local_path):
        self.client.download_file(Bucket=self.bucket, Key=s3_path, Filename=local_path)
        return True

    def upload_file(self, local_path, s3_path):
        self.client.upload_file(Filename=local_path, Bucket=self.bucket, Key=s3_path)
        return True

    def get_all_objects(self, prefix="", **base_kwargs):
        continuation_token = None
        while True:
            list_kwargs = dict(MaxKeys=1000, **base_kwargs)
            list_kwargs["Bucket"] = self.bucket
            list_kwargs["Prefix"] = prefix
            if continuation_token:
                list_kwargs["ContinuationToken"] = continuation_token
            response = self.client.list_objects_v2(**list_kwargs)
            yield from response.get("Contents", [])
            if not response.get("IsTruncated"):  # At the end of the list?
                break
            continuation_token = response.get("NextContinuationToken")

    def load_json(self, path):
        obj = self.client.get_object(Bucket=self.bucket, Key=path)
        return json.loads(obj["Body"].read())

    def save_json(self, obj, path):
        self.client.put_object(Body=json.dumps(obj), Bucket=self.bucket, Key=path)
        return True

    def write_csv(self, df, path):
        csv_buffer = BytesIO()
        df.to_csv(csv_buffer, index=False)
        self.client.put_object(Body=csv_buffer.getvalue(), Bucket=self.bucket, Key=path)
        return True

    def exists(self, path):
        # TODO: replace with an fs implemenation?
        try:
            self.client.head_object(Bucket=self.bucket, Key=path)
            return True
        except self.client.exceptions.ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            raise  # Re-raise any other errors
