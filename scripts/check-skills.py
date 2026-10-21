"""Validate canonical skill metadata with the real YAML parser; no writes."""
import re
import sys
from pathlib import Path

import yaml


class UniqueLoader(yaml.SafeLoader):
    pass


def mapping(loader, node):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node)
        if key in result:
            raise ValueError(f"duplicate metadata key: {key}")
        result[key] = loader.construct_object(value_node)
    return result


UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, mapping)


def validate(file):
    text = Path(file).read_text(encoding="utf-8")
    front = re.match(r"\A---\n(.*?)\n---(?:\n|$)", text, re.S)
    if not front:
        raise ValueError("missing YAML frontmatter")
    data = yaml.load(front[1], Loader=UniqueLoader)
    if not isinstance(data, dict):
        raise ValueError("metadata must be a mapping")
    name, description = data.get("name"), data.get("description")
    if not isinstance(name, str) or name != Path(file).parent.name or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
        raise ValueError("name must match the skill directory")
    if not isinstance(description, str) or not description.strip() or len(description) > 1024:
        raise ValueError("description must be a non-empty string, at most 1024 characters")
    if "disable-model-invocation" in data and not isinstance(data["disable-model-invocation"], bool):
        raise ValueError("disable-model-invocation must be boolean")


def main():
    files = [Path(f) for f in sys.argv[1:]] or sorted((Path(__file__).resolve().parents[1] / ".claude/skills").glob("*/SKILL.md"))
    errors = []
    for file in files:
        try:
            validate(file)
        except (ValueError, yaml.YAMLError, OSError) as error:
            errors.append(f"{file}: {error}")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Skill YAML: {len(files)} passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
