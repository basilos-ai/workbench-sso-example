# Workbench SSO Example

一个独立的 Next.js 示例应用，完整演示 Workbench OIDC Authorization Code Flow 和用户委托 API 访问：

- 从 Discovery 获取授权、Token 和 JWKS 地址。
- 使用随机 state、nonce 和 PKCE S256。
- 由服务端保存临时参数并交换 Authorization Code。
- 使用 Workbench JWKS 验证 ID Token 的 RS256 签名、issuer、audience、过期时间和 nonce。
- 使用 HttpOnly Cookie 保存短时示例会话。
- 使用 HttpOnly Cookie 保存 Access Token，并由服务端代理调用 Client API。
- 可逐项验证 10 个业务 Scope；写 Scope 使用无副作用的参数校验探针。
- 支持授权成功、用户取消、参数错误和退出。

## 注意

- 192.168.10.11:3100：本机example应用地址
- 192.168.10.11:3000：workbench后端地址

## 准备

需要 Node.js 20.9 或更高版本。

在 Workbench「开发 → OIDC 接入 → 应用管理」中新建应用：

- 应用名称：`Workbench SSO Example`
- 回调地址：`http://192.168.10.11:3100/api/auth/callback`
- 权限范围：`openid profile email chat.read chat.write workspaces.read workspaces.write tasks.read tasks.write memory.read memory.write catalog.read credits.read`

复制生成的 Client ID 和 Client Secret，然后：

    pnpm install
    cp .env.example .env.local

填写 `.env.local`：

    WORKBENCH_ISSUER=http://192.168.10.11:3000
    OIDC_CLIENT_ID=workbench_oidc_xxx
    OIDC_CLIENT_SECRET=xxx
    APP_URL=http://192.168.10.11:3100

## 运行

    npm run dev

打开 `http://192.168.10.11:3100`，点击“使用 Workbench 登录”。Workbench 前端地址不需要写入示例配置，应用会使用 Discovery 返回的 `authorization_endpoint`。

## 验证场景

1. Workbench 已登录：进入授权确认页，确认后返回示例应用。
2. Workbench 未登录：先登录 Workbench，再回到授权确认页。
3. 切换账号：退出当前 Workbench 账号，登录其他账号后继续原请求。
4. 取消：回调收到 `error=access_denied`，示例页显示可恢复提示。
5. 修改 state：示例应用拒绝回调并显示状态校验失败。
6. 修改 Client Secret、回调地址或 PKCE verifier：Token 交换失败，不建立示例会话。
7. 登录成功后逐项点击业务 Scope 的“测试”，确认 Access Token 能通过对应 API 的 Scope 鉴权。

## 安全边界

- `OIDC_CLIENT_SECRET`、PKCE verifier 和 Token 交换只存在于 Next.js 服务端。
- 浏览器只接触授权跳转和 HttpOnly 会话 Cookie。
- Access Token 不返回给浏览器 JavaScript；业务 API 由示例应用服务端调用。
- ID Token 不只是解码展示；每次读取会话都会重新执行 JWKS 验签和 Claim 校验。
- 示例会话最长保存 300 秒，与当前 Workbench Token 生命周期一致。
- 生产环境必须使用 HTTPS，并把 `APP_URL` 和登记回调地址一起改为生产域名。
