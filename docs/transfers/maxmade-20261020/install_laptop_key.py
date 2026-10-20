"""Install one public laptop key for the existing maxmade-admin account.

Executed on Ubuntu over an already trusted SSH connection. Reads only a public
key from stdin; never creates, receives or prints a private key/password.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile


def public_key(text):
    line = text.strip()
    if any(ord(char) < 32 or ord(char) == 127 for char in line):
        raise ValueError('Expected exactly one public key line')
    fields = line.split(None, 2)
    if len(fields) < 2 or fields[0] != 'ssh-ed25519':
        raise ValueError('Expected an Ed25519 public key, not a private key')
    try:
        raw = base64.b64decode(fields[1], validate=True)
    except ValueError:
        raise ValueError('Invalid public key encoding') from None
    prefix = b'\x00\x00\x00\x0bssh-ed25519\x00\x00\x00\x20'
    if not raw.startswith(prefix) or len(raw) != len(prefix) + 32:
        raise ValueError('Invalid Ed25519 public key structure')
    return fields[1], raw


def install(text, directory):
    encoded, raw = public_key(text)
    directory = Path(directory)
    target = directory / 'authorized_keys'
    if directory.is_symlink() or target.is_symlink():
        raise ValueError('Refusing a symlink for SSH authorization files')
    directory.mkdir(mode=0o700, exist_ok=True)
    original = target.read_bytes() if target.exists() else b''
    existing = original.decode('utf-8')
    for line in existing.splitlines():
        tokens = line.split()
        if any(tokens[i] == 'ssh-ed25519' and tokens[i + 1] == encoded
               for i in range(len(tokens) - 1)):
            return {'installed': False, 'alreadyPresent': True}
    entry = ('no-agent-forwarding,no-X11-forwarding,no-user-rc ssh-ed25519 '
             + encoded + ' MAXMADE-laptop\n').encode('ascii')
    if original and not original.endswith(b'\n'):
        original += b'\n'
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=directory, prefix='.laptop-key-', delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(original + entry)
            stream.flush()
            os.fsync(stream.fileno())
        temporary.chmod(0o600)
        os.replace(temporary, target)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    directory.chmod(0o700)
    fingerprint = 'SHA256:' + base64.b64encode(hashlib.sha256(raw).digest()).decode().rstrip('=')
    return {'installed': True, 'fingerprint': fingerprint}


def main():
    import fcntl
    import pwd
    user = pwd.getpwuid(os.geteuid())
    if user.pw_name != 'maxmade-admin':
        raise ValueError('Run only as maxmade-admin through the existing SSH connection')
    text = sys.stdin.read(4097)
    if len(text) > 4096:
        raise ValueError('Public key input is too large')
    directory = Path(user.pw_dir) / '.ssh'
    if directory.is_symlink():
        raise ValueError('Refusing a symlink for the SSH directory')
    directory.mkdir(mode=0o700, exist_ok=True)
    with (directory / '.laptop-key-install.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        result = install(text, directory)
    print(json.dumps(result))


if __name__ == '__main__':
    try:
        main()
    except ValueError as error:
        print('Key installation refused: ' + str(error), file=sys.stderr)
        raise SystemExit(1)
