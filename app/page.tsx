import { readSession } from '@/lib/oidc';

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: '你已取消本次授权，可以重新发起登录。',
  invalid_state: '登录状态校验失败，请重新发起登录。',
  invalid_callback: '授权回调缺少必要参数，请重新发起登录。',
  authorization: 'Workbench 未能完成授权，请检查 OIDC 应用配置。',
  configuration: '无法读取 Workbench 配置，请检查环境变量和 Discovery 地址。',
  token_exchange: '授权码交换或 ID Token 验证失败，请检查服务端配置。',
};

type HomePageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await readSession();
  const errorValue = (await searchParams).error;
  const error = Array.isArray(errorValue) ? errorValue[0] : errorValue;
  const name =
    typeof session?.name === 'string'
      ? session.name
      : typeof session?.preferred_username === 'string'
        ? session.preferred_username
        : 'Workbench 用户';

  return (
    <main className="shell">
      <section className="panel">
        <header className="brand">
          <span className="brand-mark" aria-hidden>
            <svg viewBox="0 0 24 24" role="img">
              <path d="M6.5 5.5h11v13h-11z" />
              <path d="M9.5 9h5M9.5 12h5M9.5 15h3" />
            </svg>
          </span>
          <span>
            <strong>Workbench SSO Example</strong>
            <small>OpenID Connect · Authorization Code + PKCE</small>
          </span>
        </header>

        {error ? (
          <div className="alert" role="alert">
            <strong>登录未完成</strong>
            <span>{ERROR_MESSAGES[error] ?? ERROR_MESSAGES.authorization}</span>
          </div>
        ) : null}

        {session ? (
          <>
            <div className="success-mark" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path d="m6.5 12.5 3.5 3.5 7.5-8" />
              </svg>
            </div>
            <h1>登录成功</h1>
            <p className="lede">
              你好，{name}。下列身份信息来自经过 Workbench JWKS 验签的 ID
              Token。
            </p>

            <dl className="claims">
              <div>
                <dt>Subject</dt>
                <dd>{session.sub}</dd>
              </div>
              <div>
                <dt>用户名</dt>
                <dd>{String(session.preferred_username ?? '未提供')}</dd>
              </div>
              <div>
                <dt>邮箱</dt>
                <dd>{String(session.email ?? '未提供')}</dd>
              </div>
              <div>
                <dt>Issuer</dt>
                <dd>{session.iss}</dd>
              </div>
            </dl>

            <form action="/api/auth/logout" method="post">
              <button className="button secondary" type="submit">
                退出示例应用
              </button>
            </form>
          </>
        ) : (
          <>
            <h1>使用 Workbench 账号登录</h1>
            <p className="lede">
              这个独立示例应用演示完整的 OIDC 登录流程。Client Secret、 PKCE
              verifier 和 Token 交换始终留在服务端。
            </p>

            <div className="flow" aria-label="登录流程">
              <span>示例应用</span>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M5 12h14M15 8l4 4-4 4" />
              </svg>
              <span>Workbench</span>
            </div>

            <a className="button primary" href="/api/auth/login">
              使用 Workbench 登录
            </a>
            <p className="hint">
              登录后会进入 Workbench 授权确认页，你可以授权、切换账号或取消。
            </p>
          </>
        )}
      </section>
    </main>
  );
}
