{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  buildInputs = with pkgs; [ curl unzip ];

  shellHook = ''
    set -euo pipefail
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    
    if ! command -v bun &>/dev/null; then
      curl -fsSL https://bun.sh/install | bash -s "bun-v1.1.42"
    fi

    if [ -t 0 ]; then
      echo "Interactive shell detected."
      read -p "Run setup script? [Y/n] " response
      response=${response:-Y}
      if [[ $response =~ ^[Yy]$ ]]; then
        echo "Running scripts/setup.sh..."
        bash scripts/setup.sh
      fi
    else
      echo "To set up project dependencies and environment, run scripts/setup.sh"
    fi
    set +euo pipefail
  '';
}
