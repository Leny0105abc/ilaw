"""Package the static export with explicit Linux directories for Hostinger."""
import argparse
import shutil
import stat
import zipfile
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--frontend-only", action="store_true", help="Include only generated HTML/RSC files and _next assets; never replace PHP or private configuration.")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent / "out"
    target = args.destination
    if not target.is_absolute() or not target.parent.is_dir():
        parser.error("Provide an absolute ZIP destination in an existing folder.")
    if target.exists() or target.suffix.lower() != ".zip":
        parser.error("Use a new .zip filename; existing artifacts are never overwritten.")
    if not (root / "ilaw-gateway.php").is_file():
        parser.error("Build the production static export first.")
    paths = sorted(root.rglob("*"), key=lambda p: (len(p.relative_to(root).parts), p.as_posix()))
    if args.frontend_only:
        paths = [file for file in paths if file.relative_to(root).parts[0] == "_next" or (file.parent == root and file.suffix in {".html", ".txt"})]
    for file in paths:
        if file.is_symlink():
            parser.error("Symbolic links must not be included in a release.")
        if file.name.startswith(".") or file.name in {"ilaw-auth.env", "ilaw-auth-state"}:
            parser.error("Private configuration/activation files must not be included.")
    count = 0
    with zipfile.ZipFile(target, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for file in paths:
            name = file.relative_to(root).as_posix()
            is_directory = file.is_dir()
            info = zipfile.ZipInfo(name + ("/" if is_directory else ""))
            info.create_system = 3  # Unix: preserve traversal on Linux directories.
            info.external_attr = ((stat.S_IFDIR | 0o755) if is_directory else (stat.S_IFREG | 0o644)) << 16
            if is_directory:
                info.external_attr |= 0x10
                archive.writestr(info, b"")
            else:
                info.compress_type = zipfile.ZIP_DEFLATED
                with file.open("rb") as source, archive.open(info, "w") as output:
                    shutil.copyfileobj(source, output)
                count += 1
    with zipfile.ZipFile(target) as archive:
        if archive.testzip() is not None:
            raise RuntimeError("Release archive failed integrity verification.")
        for info in archive.infolist():
            expected = 0o755 if info.is_dir() else 0o644
            if stat.S_IMODE(info.external_attr >> 16) != expected or "\\" in info.filename:
                raise RuntimeError("Release archive has invalid Linux metadata.")
    print(f"Verified {count} release files; Linux directories 0755, files 0644; no private configuration.")
    print(target)


if __name__ == "__main__":
    main()
