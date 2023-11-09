from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Pinecone
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.llms import OpenAI
from langchain.chains.question_answering import load_qa_chain
from langchain.document_loaders import UnstructuredPDFLoader, DirectoryLoader
import pinecone
import os
from dotenv import load_dotenv
from config import *

load_dotenv()

INDEX_NAME = 'chewbacca'
DIRECTORY_PATH = ROOT_DIR/"data/pdfs/"
PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')
PINECONE_API_ENV = os.getenv('PINECONE_API_ENV')

# Load the data
loader = DirectoryLoader(DIRECTORY_PATH)
data = loader.load()

text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=0)
docs = text_splitter.split_documents(data)

embeddings=OpenAIEmbeddings()

# initialize pinecone
pinecone.init(
    api_key=PINECONE_API_KEY,  
    environment=PINECONE_API_ENV
)

# First, check if our index already exists. If it doesn't, we create it
if INDEX_NAME not in pinecone.list_indexes():
    # we create a new index
    pinecone.create_index(name=INDEX_NAME, metric="cosine", dimension=1536)
    docsearch = Pinecone.from_documents(docs, embeddings, index_name=INDEX_NAME)
else:
    docsearch = Pinecone.from_existing_index(INDEX_NAME, embeddings)

query = "What did the president say about Ketanji Brown Jackson"
docs = docsearch.similarity_search(query)

def query_index(query, index_name):
    embeddings=OpenAIEmbeddings()
    docsearch = Pinecone.from_existing_index(INDEX_NAME, embeddings)
    docs = docsearch.similarity_search(query)
    llm = OpenAI(model_name="gpt-3.5-turbo", temperature=0, openai_api_key=OPENAI_API_KEY)
    chain = load_qa_chain(llm, chain_type="stuff")
    return chain.run(input_documents=docs, question=query)
    