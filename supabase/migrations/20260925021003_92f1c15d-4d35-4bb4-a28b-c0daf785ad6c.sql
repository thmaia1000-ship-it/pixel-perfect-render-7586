-- Tipos
CREATE TYPE public.app_role AS ENUM ('admin','atendente','tecnico');
CREATE TYPE public.os_status AS ENUM ('recebida','em_diagnostico','orcamento_enviado','aguardando_aprovacao','em_reparo','pronta','entregue','orcamento_recusado','cancelada');

-- Utilitário
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Perfis
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  telefone text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Papéis
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "perfis visiveis para autenticados" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "atualiza proprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "admin atualiza perfis" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin remove perfis" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "papeis visiveis para autenticados" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin gerencia papeis" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Novo usuário: cria perfil e define papel (primeiro usuário vira admin)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total int;
BEGIN
  INSERT INTO public.profiles (id, nome, email, telefone)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)),
          COALESCE(NEW.email,''),
          NEW.raw_user_meta_data->>'telefone');
  SELECT count(*) INTO total FROM public.user_roles;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN total = 0 THEN 'admin'::public.app_role
                       ELSE COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role,'atendente'::public.app_role) END);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clientes
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text NOT NULL DEFAULT '',
  email text,
  documento text,
  endereco text,
  observacoes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes autenticados" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Peças
CREATE TABLE public.pecas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  codigo text,
  quantidade integer NOT NULL DEFAULT 0,
  quantidade_minima integer NOT NULL DEFAULT 1,
  custo numeric(12,2) NOT NULL DEFAULT 0,
  preco numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pecas TO authenticated;
GRANT ALL ON public.pecas TO service_role;
ALTER TABLE public.pecas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pecas autenticados" ON public.pecas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER pecas_updated_at BEFORE UPDATE ON public.pecas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ordens de serviço
CREATE SEQUENCE public.os_numero_seq START 1;
CREATE OR REPLACE FUNCTION public.gera_numero_os() RETURNS text
LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'OS-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.os_numero_seq')::text, 4, '0');
$$;

CREATE TABLE public.ordens_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE DEFAULT public.gera_numero_os(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  aparelho text NOT NULL DEFAULT '',
  marca text,
  modelo text,
  imei text,
  acessorios text,
  defeito_relatado text NOT NULL DEFAULT '',
  estado_fisico text,
  diagnostico text,
  valor_pecas numeric(12,2) NOT NULL DEFAULT 0,
  valor_mao_obra numeric(12,2) NOT NULL DEFAULT 0,
  prazo date,
  tecnico_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.os_status NOT NULL DEFAULT 'recebida',
  garantia_dias integer NOT NULL DEFAULT 90,
  entregue_em timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_servico TO authenticated;
GRANT ALL ON public.ordens_servico TO service_role;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "os autenticados" ON public.ordens_servico FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER os_updated_at BEFORE UPDATE ON public.ordens_servico FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX ordens_servico_status_idx ON public.ordens_servico(status);
CREATE INDEX ordens_servico_cliente_idx ON public.ordens_servico(cliente_id);

-- Histórico
CREATE TABLE public.os_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  status public.os_status NOT NULL,
  observacao text,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.os_historico TO authenticated;
GRANT ALL ON public.os_historico TO service_role;
ALTER TABLE public.os_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "historico leitura" ON public.os_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "historico insercao" ON public.os_historico FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX os_historico_os_idx ON public.os_historico(os_id);

-- Dados de demonstração
INSERT INTO public.clientes (id, nome, telefone, email, documento, endereco) VALUES
 ('11111111-1111-4111-8111-111111111101','Ana Paula Ribeiro','(92) 98811-2201','ana.ribeiro@email.com','012.345.678-90','Rua das Acácias, 120 - Manaus/AM'),
 ('11111111-1111-4111-8111-111111111102','Carlos Eduardo Lima','(92) 99122-4455','carlos.lima@email.com','987.654.321-00','Av. Torquato Tapajós, 890 - Manaus/AM'),
 ('11111111-1111-4111-8111-111111111103','Mariana Souza','(92) 98444-7788','mariana.souza@email.com','456.789.123-11','Rua Recife, 45 - Manaus/AM'),
 ('11111111-1111-4111-8111-111111111104','Escritório Conecta Ltda','(92) 3232-1010','contato@conecta.com.br','12.345.678/0001-99','Av. Djalma Batista, 1500 - Manaus/AM');

INSERT INTO public.pecas (nome, codigo, quantidade, quantidade_minima, custo, preco) VALUES
 ('Tela iPhone 11 (compatível)','TL-IP11',4,2,320.00,650.00),
 ('Bateria Samsung A32','BT-A32',1,3,75.00,180.00),
 ('Conector de carga Moto G60','CN-MG60',6,3,28.00,90.00),
 ('SSD 480GB SATA','SSD-480',2,2,180.00,320.00),
 ('Memória DDR4 8GB','MEM-D48',0,2,140.00,260.00),
 ('Teclado Notebook Dell Inspiron','TC-DELL',3,1,95.00,210.00);

INSERT INTO public.ordens_servico (cliente_id, aparelho, marca, modelo, imei, acessorios, defeito_relatado, estado_fisico, diagnostico, valor_pecas, valor_mao_obra, prazo, status, garantia_dias) VALUES
 ('11111111-1111-4111-8111-111111111101','Celular','Apple','iPhone 11','356789104567890','Capa e carregador','Tela trincada após queda','Carcaça com marcas leves','Troca de tela necessária',650.00,150.00, CURRENT_DATE + 2,'aguardando_aprovacao',90),
 ('11111111-1111-4111-8111-111111111102','Celular','Samsung','Galaxy A32','351122334455667','Nenhum','Não carrega e desliga sozinho','Bom estado','Bateria viciada',180.00,80.00, CURRENT_DATE + 1,'em_reparo',90),
 ('11111111-1111-4111-8111-111111111103','Notebook','Dell','Inspiron 15','SN-DL-99213','Fonte','Teclado com teclas falhando','Ótimo estado',NULL,210.00,120.00, CURRENT_DATE + 5,'em_diagnostico',90),
 ('11111111-1111-4111-8111-111111111104','Computador','Positivo','Master D570','SN-PS-77120','Cabo de força','Lentidão extrema ao iniciar','Gabinete empoeirado','Disco rígido com falhas, migrar para SSD',320.00,150.00, CURRENT_DATE + 3,'orcamento_enviado',90),
 ('11111111-1111-4111-8111-111111111101','Celular','Motorola','Moto G60','359988776655443','Nenhum','Não reconhece o cabo','Bom estado','Conector de carga oxidado',90.00,70.00, CURRENT_DATE - 1,'pronta',90),
 ('11111111-1111-4111-8111-111111111102','Celular','Xiaomi','Redmi Note 10','358877665544332','Capa','Câmera traseira embaçada','Bom estado','Lente substituída',120.00,90.00, CURRENT_DATE - 6,'entregue',90),
 ('11111111-1111-4111-8111-111111111103','Notebook','Acer','Aspire 5','SN-AC-55231','Fonte e mochila','Superaquecimento','Bom estado','Limpeza e troca de pasta térmica',0.00,140.00, CURRENT_DATE - 10,'entregue',90),
 ('11111111-1111-4111-8111-111111111104','Computador','Dell','OptiPlex 3080','SN-DL-31002','Nenhum','Não liga','Bom estado','Fonte queimada; cliente recusou orçamento',0.00,0.00, CURRENT_DATE - 4,'orcamento_recusado',90);

UPDATE public.ordens_servico SET entregue_em = now() - interval '5 days' WHERE status = 'entregue';

INSERT INTO public.os_historico (os_id, status, observacao, usuario_nome)
SELECT id, 'recebida', 'Aparelho recebido no balcão', 'Demonstração' FROM public.ordens_servico;
INSERT INTO public.os_historico (os_id, status, observacao, usuario_nome, created_at)
SELECT id, status, 'Situação atual registrada', 'Demonstração', now() FROM public.ordens_servico WHERE status <> 'recebida';