from langchain.agents import load_tools
from langchain.agents import initialize_agent
from langchain.agents import AgentType
from langchain.llms import OpenAI
from langchain.tools import DuckDuckGoSearchRun
from langchain.utilities import WikipediaAPIWrapper
from langchain.tools import ShellTool

from langchain.agents import Tool
from langchain.tools.file_management.write import WriteFileTool
from langchain.tools.file_management.read import ReadFileTool
import dotenv

import faiss
from langchain.vectorstores import FAISS
from langchain.docstore import InMemoryDocstore
from langchain.embeddings import OpenAIEmbeddings

from langchain.experimental import AutoGPT
from langchain.chat_models import ChatOpenAI

dotenv.load_dotenv()

# llm = OpenAI(temperature=0)
search = DuckDuckGoSearchRun()
wiki = WikipediaAPIWrapper()

tools = [
    Tool(
        name = 'wikipedia',
        func=wiki.run,
        description = 'useful for looking up facts'
    ),
    Tool(
        name = 'search',
        func = search.run,
        description = 'useful for searching the web'
    ),
    # ShellTool(),
    WriteFileTool(),
    ReadFileTool(),
]

# Define your embedding model
embeddings_model = OpenAIEmbeddings()
# Initialize the vectorstore as empty

embedding_size = 1536
index = faiss.IndexFlatL2(embedding_size)
vectorstore = FAISS(embeddings_model.embed_query, index, InMemoryDocstore({}), {})

agent = AutoGPT.from_llm_and_tools(
    ai_name="Chewbacca",
    ai_role="Assistant",
    tools=tools,
    llm=ChatOpenAI(temperature=0),
    memory=vectorstore.as_retriever()
)
# Set verbose to be true
agent.chain.verbose = True

agent.run(["Find a vegetarian recipe with corn in it that feels like a good summer meal. Write the recipe to the current directory."])