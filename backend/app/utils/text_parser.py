import os
import pypdf
import docx

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from a PDF file using pypdf."""
    text_content = []
    with open(file_path, "rb") as f:
        reader = pypdf.PdfReader(f)
        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_content.append(text)
    return "\n".join(text_content)

def extract_text_from_docx(file_path: str) -> str:
    """Extract text from a DOCX file, including tables."""
    doc = docx.Document(file_path)
    text_content = []
    
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
                
    return "\n".join(text_content)

def extract_text(file_path: str) -> str:
    """Detect file type and extract text content."""
    _, ext = os.path.splitext(file_path.lower())
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext in [".docx", ".doc"]:
        return extract_text_from_docx(file_path)
    else:
        # Fallback to plain text reading
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
