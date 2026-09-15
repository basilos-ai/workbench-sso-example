'use client';

import { useState } from 'react';

import { API_SCOPE_TESTS, type ApiScope } from '@/lib/scope-tests';

type ScopeResult = {
  status?: number;
  authorized?: boolean;
  body?: string;
  error?: string;
};

export function ScopeTests({ grantedScopes }: { grantedScopes: string[] }) {
  const [loading, setLoading] = useState<ApiScope | null>(null);
  const [results, setResults] = useState<Partial<Record<ApiScope, ScopeResult>>>(
    {},
  );

  async function run(scope: ApiScope) {
    setLoading(scope);
    try {
      const response = await fetch('/api/scope-test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      const result = (await response.json()) as ScopeResult;
      setResults((current) => ({ ...current, [scope]: result }));
    } catch {
      setResults((current) => ({
        ...current,
        [scope]: { error: 'request_failed' },
      }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="scope-tests" aria-labelledby="scope-tests-title">
      <div className="section-heading">
        <h2 id="scope-tests-title">业务 Scope 测试</h2>
        <p>由示例服务端携带 Access Token 调用 Workbench Client API。</p>
      </div>

      <ul className="scope-list">
        {API_SCOPE_TESTS.map((test) => {
          const granted = grantedScopes.includes(test.scope);
          const result = results[test.scope];
          return (
            <li key={test.scope}>
              <span>
                <code>{test.scope}</code>
                <small>{test.label}</small>
              </span>
              <button
                className="scope-button"
                type="button"
                disabled={!granted || loading !== null}
                onClick={() => run(test.scope)}
              >
                {loading === test.scope ? '测试中…' : granted ? '测试' : '未授权'}
              </button>
              {result ? (
                <div className="scope-result">
                  <output
                    className={result.authorized ? 'scope-pass' : 'scope-fail'}
                  >
                    {result.error
                      ? '请求失败'
                      : result.authorized
                        ? `鉴权通过 · HTTP ${result.status}`
                        : `鉴权拒绝 · HTTP ${result.status}`}
                  </output>
                  {result.body ? <pre>{result.body}</pre> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="scope-note">
        写权限只发送无法通过参数校验的探测请求，用于验证 Scope，不会修改数据。
      </p>
    </section>
  );
}
