# Configuração de Ambiente para Google Project IDX & Google AI Studio
# Documentação: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  # Canal de pacotes estável do Nix
  channel = "stable-24.05";

  # Ferramentas instaladas no container do Google
  packages = [
    pkgs.nodejs_20
    pkgs.bun
    pkgs.git
  ];

  # Variáveis de ambiente padrão
  env = {
    PORT = "3000";
    NODE_ENV = "development";
  };

  idx = {
    # Extensões recomendadas no ambiente Google
    extensions = [
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
    ];

    # Configuração de Preview Web Integrado
    previews = {
      enable = true;
      previews = {
        web = {
          command = [
            "bun"
            "run"
            "dev"
            "--"
            "--port"
            "$PORT"
            "--host"
            "0.0.0.0"
          ];
          manager = "web";
        };
      };
    };

    # Ciclo de vida do Workspace
    workspace = {
      onCreate = {
        install-deps = "bun install";
      };
      onStart = {
        # Inicia a verificação de ambiente
      };
    };
  };
}
