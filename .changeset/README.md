# Changesets

This project uses [changesets](https://github.com/changesets/changesets) to manage versions and publish packages.

## 日常开发 / Daily Workflow

每次提交功能或修复时，运行：

```bash
pnpm changeset
```

按提示选择受影响的包和版本类型（patch/minor/major），填写变更说明。

## 发布 / Release

```bash
pnpm changeset:version   # bump 版本 + 生成 CHANGELOG
pnpm changeset:publish   # 发布到 npm
```
