import os
from pptx import Presentation
from src.services.file_type_parsers.BaseParsingService import BaseParsingService


class PptxParsingService(BaseParsingService):

    def _get_document_type(self) -> str:
        return "pptx"

    def _extract_sentences(self, path: str) -> list[dict]:
        filename = os.path.basename(path)
        sentences = []
        sentence_index = 0

        try:
            presentation = Presentation(path)
        except Exception as e:
            raise Exception(f"Failed to open PPTX {filename}: {str(e)}")

        for slide_index in range(len(presentation.slides)):
            slide = presentation.slides[slide_index]

            # collect all shape texts on this slide
            for shape in slide.shapes:
                if shape.has_text_frame:
                    for paragraph in shape.text_frame.paragraphs:
                        text = paragraph.text.strip()

                        if self._is_noise(text):
                            continue

                        # prefix with slide number for context
                        sentence_text = f"Slide {slide_index + 1}: {text}"

                        sentences.append({
                            "text": sentence_text,
                            "index": sentence_index
                        })

                        sentence_index = sentence_index + 1

        return sentences