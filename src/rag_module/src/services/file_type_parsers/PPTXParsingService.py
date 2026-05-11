import os
from pptx import Presentation
from src.services.file_type_parsers.BaseParsingService import BaseParsingService


class PptxParsingService(BaseParsingService):

    def _get_document_type(self) -> str:
        return "pptx"

    def _extract_text(self, path: str) -> str:
        filename = os.path.basename(path)

        try:
            presentation = Presentation(path)
        except Exception as e:
            raise Exception(f"Failed to open PPTX {filename}: {str(e)}")

        # collect text from every shape on every slide
        texts = []
        for slide_index in range(len(presentation.slides)):
            slide = presentation.slides[slide_index]

            for shape in slide.shapes:
                if shape.has_text_frame:
                    text = shape.text.strip()
                    if text:
                        texts.append(text)

        # join all slide texts into one full text string
        # nltk will handle sentence splitting in base class
        full_text = " ".join(texts)
        return full_text