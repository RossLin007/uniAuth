#!/bin/bash
# UniAuth SDK 发布脚本
# 用于发布 @55387.ai/uniauth-client 和 @55387.ai/uniauth-server 到 npm

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     UniAuth SDK Publish Script             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# 检查 npm 登录状态
check_npm_login() {
    echo -e "${YELLOW}📦 检查 npm 登录状态...${NC}"
    if ! npm whoami &> /dev/null; then
        echo -e "${RED}❌ 未登录 npm，请先执行: npm login${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ 已登录 npm: $(npm whoami)${NC}"
}

# 构建 SDK
build_sdk() {
    local package_name=$1
    local package_path=$2
    
    echo -e "${YELLOW}🔨 构建 ${package_name}...${NC}"
    cd "$package_path"
    
    # 安装依赖
    pnpm install
    
    # 构建
    pnpm build
    
    echo -e "${GREEN}✅ ${package_name} 构建完成${NC}"
}

# 发布 SDK
publish_sdk() {
    local package_name=$1
    local package_path=$2
    local dry_run=$3
    
    cd "$package_path"
    
    # 获取当前版本
    local version=$(node -p "require('./package.json').version")
    local npm_name=$(node -p "require('./package.json').name")
    
    echo -e "${YELLOW}📤 发布 ${npm_name}@${version}...${NC}"
    
    if [ "$dry_run" = "true" ]; then
        echo -e "${BLUE}   (Dry Run 模式 - 不会实际发布)${NC}"
        npm publish --dry-run
    else
        npm publish --access public
    fi
    
    echo -e "${GREEN}✅ ${npm_name}@${version} 发布成功${NC}"
}

# 版本更新
bump_version() {
    local package_path=$1
    local bump_type=$2  # patch, minor, major
    
    cd "$package_path"
    
    local old_version=$(node -p "require('./package.json').version")
    npm version "$bump_type" --no-git-tag-version
    local new_version=$(node -p "require('./package.json').version")
    
    echo -e "${GREEN}   版本更新: ${old_version} → ${new_version}${NC}"
}

# 主流程
main() {
    local dry_run=false
    local bump_type=""
    local client_only=false
    local server_only=false
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                dry_run=true
                shift
                ;;
            --patch|--minor|--major)
                bump_type="${1#--}"
                shift
                ;;
            --client)
                client_only=true
                shift
                ;;
            --server)
                server_only=true
                shift
                ;;
            -h|--help)
                echo "用法: $0 [options]"
                echo ""
                echo "选项:"
                echo "  --dry-run     测试发布，不实际提交到 npm"
                echo "  --patch       发布前自动 patch 版本号 (1.0.0 → 1.0.1)"
                echo "  --minor       发布前自动 minor 版本号 (1.0.0 → 1.1.0)"
                echo "  --major       发布前自动 major 版本号 (1.0.0 → 2.0.0)"
                echo "  --client      仅发布 client-sdk"
                echo "  --server      仅发布 server-sdk"
                echo "  -h, --help    显示帮助"
                exit 0
                ;;
            *)
                echo -e "${RED}未知参数: $1${NC}"
                exit 1
                ;;
        esac
    done
    
    # 检查登录
    check_npm_login
    echo ""
    
    # Client SDK
    if [ "$server_only" = "false" ]; then
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}📦 @55387.ai/uniauth-client${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        if [ -n "$bump_type" ]; then
            bump_version "$ROOT_DIR/packages/client-sdk" "$bump_type"
        fi
        
        build_sdk "client-sdk" "$ROOT_DIR/packages/client-sdk"
        publish_sdk "client-sdk" "$ROOT_DIR/packages/client-sdk" "$dry_run"
        echo ""
    fi
    
    # Server SDK
    if [ "$client_only" = "false" ]; then
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}📦 @55387.ai/uniauth-server${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        if [ -n "$bump_type" ]; then
            bump_version "$ROOT_DIR/packages/server-sdk" "$bump_type"
        fi
        
        build_sdk "server-sdk" "$ROOT_DIR/packages/server-sdk"
        publish_sdk "server-sdk" "$ROOT_DIR/packages/server-sdk" "$dry_run"
        echo ""
    fi
    
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     🎉 发布完成!                           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
}

main "$@"
