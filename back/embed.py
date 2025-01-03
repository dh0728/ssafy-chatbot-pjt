import os

from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_pinecone import PineconeVectorStore
from langchain_upstage import UpstageDocumentParseLoader
from langchain_upstage import UpstageEmbeddings
from pinecone import Pinecone, ServerlessSpec
from langchain.docstore.document import Document
from langchain_chroma import Chroma
import pandas as pd


load_dotenv()

# upstage models
embedding_upstage = UpstageEmbeddings(model="embedding-query")

pinecone_api_key = os.environ.get("PINECONE_API_KEY")
# upstage_api_key = os.environ.get("UPSTAGE_API_KEY")
pc = Pinecone(api_key=pinecone_api_key)
index_name = "ai-project"
pdf_path = "개인정보_보호법_법률_제19234호_20240315.pdf"
csv_path = "250101_extracted_laws.csv"
df = pd.read_csv(csv_path)

# `Original Text` 열을 Document 객체로 변환
# `Original Text`와 `Extracted Laws`를 포함한 Document 객체 생성
csv_docs = [
    Document(
        page_content=row["Original Text"], 
        metadata={
            "extracted_laws": row["Extracted Laws"]
        }
    )
    for _, row in df.iterrows()
]


# create new index
if index_name not in pc.list_indexes().names():
    pc.create_index(
        name=index_name,
        dimension=4096,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )

print("start")
document_parse_loader = UpstageDocumentParseLoader(
    pdf_path,
    output_format='html',  # 결과물 형태 : HTML
    coordinates=False)  # 이미지 OCR 좌표계 가지고 오지 않기

docs = document_parse_loader.load()

# Split the document into chunks

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=125)

# Embed the splits

splits = text_splitter.split_documents(docs)

print("Splits:", len(splits))



# CSV 데이터를 청크로 분할
csv_splits = text_splitter.split_documents(csv_docs)
print(f"CSV Splits: {len(csv_splits)}")

# Step 3: 청크 병합
splits = splits + csv_splits


# 데이터 정리

## NaN 값제거
cleaned_splits = [
    doc for doc in splits if doc.page_content and not any(
        pd.isna(value) for value in doc.metadata.values()
    )
]

# 텍스트 인코딩 정리
def clean_text(text):
    try:
        return text.encode("utf-8").decode("utf-8")
    except UnicodeDecodeError:
        return text.encode("utf-8", "ignore").decode("utf-8")

for doc in cleaned_splits:
    doc.page_content = clean_text(doc.page_content)


PineconeVectorStore.from_documents(
    cleaned_splits, embedding_upstage, index_name=index_name
)

# Chroma 활용하여 vectorstore 만들기
# try:
#     chroma_vectorstore = Chroma.from_documents(
#         documents=splits, embedding=UpstageEmbeddings(model="embedding-query")
#     )
# except Exception as e:
#     print(e)



print("end")
