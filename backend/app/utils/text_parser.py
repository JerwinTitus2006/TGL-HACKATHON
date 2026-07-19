import os
import pypdf
import docx

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from a PDF file using pypdf, wrapped in try-except to avoid crashes."""
    text_content = []
    try:
        with open(file_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            for page in reader.pages:
                try:
                    text = page.extract_text()
                    if text:
                        text_content.append(text)
                except Exception as page_err:
                    print(f"[Text Parser] Warning: failed to extract text from PDF page: {page_err}")
    except Exception as pdf_err:
        print(f"[Text Parser] Failed to read PDF file {file_path}: {pdf_err}")
    return "\n".join(text_content)

def extract_text_from_docx(file_path: str) -> str:
    """Extract text from a DOCX file, including tables, wrapped in try-except."""
    text_content = []
    try:
        doc = docx.Document(file_path)
        # Extract text from paragraphs
        for p in doc.paragraphs:
            if p.text.strip():
                text_content.append(p.text)
                
        # Extract text from tables to capture tabular resume data
        for table in doc.tables:
            for row in table.rows:
                row_text = []
                for cell in row.cells:
                    cell_text = cell.text.strip()
                    if cell_text and cell_text not in row_text:
                        row_text.append(cell_text)
                if row_text:
                    text_content.append(" | ".join(row_text))
    except Exception as docx_err:
        print(f"[Text Parser] Failed to read DOCX file {file_path}: {docx_err}")
    return "\n".join(text_content)

def extract_text(file_path: str) -> str:
    """Detect file type and extract text content. Safe from any file read exceptions."""
    try:
        _, ext = os.path.splitext(file_path.lower())
        if ext == ".pdf":
            text = extract_text_from_pdf(file_path)
            if text.strip():
                return text
        elif ext in [".docx", ".doc"]:
            text = extract_text_from_docx(file_path)
            if text.strip():
                return text
        
        # Fallback to plain text reading
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
    except Exception as e:
        print(f"[Text Parser] Critical failure extracting {file_path}: {e}")
        
    return f"Document file reference: {os.path.basename(file_path)}"
