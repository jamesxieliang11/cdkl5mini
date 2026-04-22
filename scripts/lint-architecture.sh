#!/bin/bash
# 架构约束检查脚本
# 用法: bash scripts/lint-architecture.sh
# 检查项目是否遵守 AGENTS.md 中定义的关键约定

set -e

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)/base"
ERRORS=0
WARNINGS=0

echo "🔍 希舞之家小程序 - 架构约束检查"
echo "================================="
echo ""

# ────────────────────────────────────────────
# 规则 1: 页面不应直接调用 wx.cloud.callFunction
# （应通过 utils/database.js 封装）
# ────────────────────────────────────────────
echo "📋 规则 1: 检查页面是否绕过 database.js 直接调用云函数..."
DIRECT_CALLS=$(grep -rn "wx\.cloud\.callFunction" "$BASE_DIR/pages/" --include="*.js" 2>/dev/null || true)
if [ -n "$DIRECT_CALLS" ]; then
    echo "  ⚠️  警告: 以下页面直接调用了 wx.cloud.callFunction"
    echo "  建议通过 utils/database.js 封装调用"
    echo "$DIRECT_CALLS" | while IFS= read -r line; do
        echo "    $line"
    done
    WARNINGS=$((WARNINGS + 1))
else
    echo "  ✅ 通过"
fi
echo ""

# ────────────────────────────────────────────
# 规则 2: 云函数必须返回 { success, message } 格式
# ────────────────────────────────────────────
echo "📋 规则 2: 检查云函数返回值格式..."
for cf_dir in "$BASE_DIR/cloudfunctions"/*/; do
    cf_name=$(basename "$cf_dir")
    cf_file="$cf_dir/index.js"
    if [ -f "$cf_file" ]; then
        # 检查是否有 success 字段的返回
        HAS_SUCCESS=$(grep -c "success:" "$cf_file" 2>/dev/null || echo "0")
        if [ "$HAS_SUCCESS" -eq 0 ]; then
            echo "  ❌ 错误: $cf_name/index.js 未使用标准返回格式 { success: ... }"
            ERRORS=$((ERRORS + 1))
        fi
    fi
done
echo "  ✅ 检查完成"
echo ""

# ────────────────────────────────────────────
# 规则 3: 云函数中修改/删除操作必须包含 user_id 校验
# ────────────────────────────────────────────
echo "📋 规则 3: 检查云函数中的所有权校验..."
for cf_dir in "$BASE_DIR/cloudfunctions"/*/; do
    cf_name=$(basename "$cf_dir")
    cf_file="$cf_dir/index.js"
    if [ -f "$cf_file" ]; then
        # 检查是否使用 .doc() 而非 .where() 来做更新/删除
        DOC_UPDATE=$(grep -n "\.doc(.*)\.\(update\|remove\)" "$cf_file" 2>/dev/null || true)
        if [ -n "$DOC_UPDATE" ]; then
            echo "  ⚠️  警告: $cf_name 使用 .doc().update/remove 而非 .where({ user_id }) 模式"
            echo "$DOC_UPDATE" | while IFS= read -r line; do
                echo "    $line"
            done
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
done
echo "  ✅ 检查完成"
echo ""

# ────────────────────────────────────────────
# 规则 4: 云函数必须使用 DYNAMIC_CURRENT_ENV
# ────────────────────────────────────────────
echo "📋 规则 4: 检查云函数环境配置..."
for cf_dir in "$BASE_DIR/cloudfunctions"/*/; do
    cf_name=$(basename "$cf_dir")
    cf_file="$cf_dir/index.js"
    if [ -f "$cf_file" ]; then
        HARDCODED_ENV=$(grep -n "env:.*['\"]cloud" "$cf_file" 2>/dev/null || true)
        if [ -n "$HARDCODED_ENV" ]; then
            echo "  ❌ 错误: $cf_name 硬编码了云环境 ID，应使用 cloud.DYNAMIC_CURRENT_ENV"
            echo "$HARDCODED_ENV" | while IFS= read -r line; do
                echo "    $line"
            done
            ERRORS=$((ERRORS + 1))
        fi
    fi
done
echo "  ✅ 检查完成"
echo ""

# ────────────────────────────────────────────
# 规则 5: 页面文件完整性（4 文件一组）
# ────────────────────────────────────────────
echo "📋 规则 5: 检查页面文件完整性..."
for page_dir in "$BASE_DIR/pages"/*/; do
    page_name=$(basename "$page_dir")
    MISSING=""
    
    # 检查 admin 目录的特殊命名
    if [ "$page_name" = "admin" ]; then
        for ext in js json wxml wxss; do
            if [ ! -f "$page_dir/admin.$ext" ]; then
                MISSING="$MISSING admin.$ext"
            fi
        done
    else
        for ext in js json wxml wxss; do
            if [ ! -f "$page_dir/index.$ext" ]; then
                MISSING="$MISSING index.$ext"
            fi
        done
    fi
    
    if [ -n "$MISSING" ]; then
        echo "  ⚠️  警告: pages/$page_name/ 缺少文件:$MISSING"
        WARNINGS=$((WARNINGS + 1))
    fi
done
echo "  ✅ 检查完成"
echo ""

# ────────────────────────────────────────────
# 规则 6: app.json 中注册的页面必须存在
# ────────────────────────────────────────────
echo "📋 规则 6: 检查 app.json 页面路由..."
if [ -f "$BASE_DIR/app.json" ]; then
    # 提取 pages 数组中的路径
    PAGES=$(grep -o '"pages/[^"]*"' "$BASE_DIR/app.json" | tr -d '"')
    for page in $PAGES; do
        page_js="$BASE_DIR/$page.js"
        if [ ! -f "$page_js" ]; then
            echo "  ❌ 错误: app.json 注册了 $page 但文件不存在"
            ERRORS=$((ERRORS + 1))
        fi
    done
fi
echo "  ✅ 检查完成"
echo ""

# ────────────────────────────────────────────
# 规则 7: database.js 导出函数检查
# ────────────────────────────────────────────
echo "📋 规则 7: 检查 database.js 导出完整性..."
DB_FILE="$BASE_DIR/utils/database.js"
if [ -f "$DB_FILE" ]; then
    # 检查是否有 module.exports
    HAS_EXPORTS=$(grep -c "module\.exports" "$DB_FILE" 2>/dev/null || echo "0")
    if [ "$HAS_EXPORTS" -eq 0 ]; then
        echo "  ❌ 错误: database.js 没有 module.exports"
        ERRORS=$((ERRORS + 1))
    else
        echo "  ✅ 通过"
    fi
fi
echo ""

# ────────────────────────────────────────────
# 总结
# ────────────────────────────────────────────
echo "================================="
echo "📊 检查结果: $ERRORS 个错误, $WARNINGS 个警告"

if [ $ERRORS -gt 0 ]; then
    echo "❌ 存在架构违规，请修复后重试"
    exit 1
else
    echo "✅ 架构检查通过"
    exit 0
fi
