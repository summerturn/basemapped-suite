"""Custom exceptions for GeoLint data ingestion."""


class UnsupportedFormatError(Exception):
    """Raised when the input file format is not supported."""

    pass


class CorruptFileError(Exception):
    """Raised when the input file is corrupt or unreadable."""

    pass


class MissingCRSWarning(UserWarning):
    """Issued when a dataset lacks a defined CRS."""

    pass


class EmptyDatasetError(Exception):
    """Raised when a dataset contains no features."""

    pass
