export const API_SCOPE_TESTS = [
  {
    scope: 'chat.read',
    label: '读取会话',
    method: 'GET',
    path: '/basilcraw/api/client/chat/models',
  },
  {
    scope: 'chat.write',
    label: '操作会话',
    method: 'POST',
    path: '/basilcraw/api/client/chat/attachments/upload',
    probe: true,
  },
  {
    scope: 'workspaces.read',
    label: '读取 Workspace',
    method: 'GET',
    path: '/basilcraw/api/client/workspaces',
  },
  {
    scope: 'workspaces.write',
    label: '操作 Workspace',
    method: 'PUT',
    path: '/basilcraw/api/client/workspaces/scope-test',
    probe: true,
  },
  {
    scope: 'tasks.read',
    label: '读取任务',
    method: 'GET',
    path: '/basilcraw/api/client/scheduled-tasks',
  },
  {
    scope: 'tasks.write',
    label: '操作任务',
    method: 'PUT',
    path: '/basilcraw/api/client/scheduled-tasks/scope-test',
    probe: true,
  },
  {
    scope: 'memory.read',
    label: '读取 Memory',
    method: 'GET',
    path: '/basilcraw/api/client/memory',
  },
  {
    scope: 'memory.write',
    label: '操作 Memory',
    method: 'PATCH',
    path: '/basilcraw/api/client/memory',
    probe: true,
  },
  {
    scope: 'catalog.read',
    label: '读取能力目录',
    method: 'GET',
    path: '/basilcraw/api/client/capabilities?page=1&pageSize=1',
  },
  {
    scope: 'credits.read',
    label: '读取 Credits',
    method: 'GET',
    path: '/basilcraw/api/client/credits/summary',
  },
] as const;

export type ApiScope = (typeof API_SCOPE_TESTS)[number]['scope'];
