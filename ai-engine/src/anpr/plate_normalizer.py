"""
Indian License Plate Normalization & Format Validation
Phase: 9 — ANPR / Automatic Number Plate Recognition
"""
import re
from typing import Tuple
from .anpr_state import ValidationStatus

# Valid 2-letter Indian State & Union Territory codes
INDIAN_STATE_CODES = {
    "AN", "AP", "AR", "AS", "BR", "CH", "CG", "DD", "DL", "DN",
    "GA", "GJ", "HP", "HR", "JH", "JK", "KA", "KL", "LA", "LD",
    "MH", "ML", "MN", "MP", "MZ", "NL", "OD", "OR", "PB", "PY",
    "RJ", "SK", "TN", "TR", "TS", "UK", "UP", "WB"
}

# Standard Indian License Plate RegEx:
# e.g., GJ01AB1234, MH12DE1432, GJ3A1234, DL1CAB1234
STANDARD_INDIAN_PATTERN = re.compile(r"^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{4})$")

# Bharat (BH) Series RegEx:
# e.g., 22BH1234AA
BHARAT_SERIES_PATTERN = re.compile(r"^([0-9]{2})BH([0-9]{4})([A-Z]{1,2})$")

# Common OCR confusion maps
LETTER_TO_DIGIT = {
    'O': '0', 'Q': '0', 'D': '0',
    'I': '1', 'L': '1',
    'Z': '2',
    'S': '5',
    'G': '6',
    'B': '8',
}

DIGIT_TO_LETTER = {
    '0': 'O',
    '1': 'I',
    '2': 'Z',
    '5': 'S',
    '6': 'G',
    '8': 'B',
}


def normalize_plate_text(raw_text: str) -> str:
    """
    Normalizes OCR output:
    - Converts to uppercase
    - Strips whitespace, hyphens, periods, colons, underscores
    - Removes non-alphanumeric characters
    """
    if not raw_text:
        return ""
    # Uppercase and remove any punctuation / whitespace
    cleaned = re.sub(r"[^A-Za-z0-9]", "", raw_text.upper())
    return cleaned


def attempt_contextual_corrections(text: str) -> str:
    """
    Applies contextual character corrections for standard Indian plates:
    State (2 letters) + District (1-2 digits) + Series (1-3 letters) + Number (4 digits)
    """
    if len(text) < 8 or len(text) > 11:
        return text

    chars = list(text)

    # First 2 must be state letters
    for i in range(2):
        if chars[i] in DIGIT_TO_LETTER:
            chars[i] = DIGIT_TO_LETTER[chars[i]]

    # Next 2 should be district digits
    for i in range(2, 4):
        if chars[i] in LETTER_TO_DIGIT:
            chars[i] = LETTER_TO_DIGIT[chars[i]]

    # Last 4 should be number digits
    for i in range(len(chars) - 4, len(chars)):
        if chars[i] in LETTER_TO_DIGIT:
            chars[i] = LETTER_TO_DIGIT[chars[i]]

    return "".join(chars)


def validate_indian_plate(raw_text: str, confidence: float = 1.0) -> Tuple[ValidationStatus, str]:
    """
    Validates recognized text against official Indian registration plate formats.
    Returns (ValidationStatus, normalized_text).
    """
    normalized = normalize_plate_text(raw_text)
    # Strip leading border artifact (e.g. 'I' or '1' from left border line: 'IGJ01AB1234' -> 'GJ01AB1234')
    if len(normalized) > 10 and normalized[0] in ('I', '1', 'L', 'T', 'J') and normalized[1:3] in INDIAN_STATE_CODES:
        normalized = normalized[1:]
    elif len(normalized) > 10 and normalized[-1] in ('I', '1', 'L', 'T', 'J') and normalized[:2] in INDIAN_STATE_CODES:
        normalized = normalized[:-1]

    # Check direct match with standard Indian registration
    if STANDARD_INDIAN_PATTERN.match(normalized):
        state = normalized[:2]
        if state in INDIAN_STATE_CODES:
            status = ValidationStatus.VALID if confidence >= 0.50 else ValidationStatus.LOW_CONFIDENCE
            return status, normalized

    # Check Bharat (BH) series
    if BHARAT_SERIES_PATTERN.match(normalized):
        status = ValidationStatus.VALID if confidence >= 0.50 else ValidationStatus.LOW_CONFIDENCE
        return status, normalized

    # Try contextual OCR corrections (e.g. O -> 0, I -> 1)
    corrected = attempt_contextual_corrections(normalized)
    if STANDARD_INDIAN_PATTERN.match(corrected):
        state = corrected[:2]
        if state in INDIAN_STATE_CODES:
            status = ValidationStatus.VALID if confidence >= 0.50 else ValidationStatus.LOW_CONFIDENCE
            return status, corrected

    # Preserved as INVALID_FORMAT for auditability
    return ValidationStatus.INVALID_FORMAT, normalized
