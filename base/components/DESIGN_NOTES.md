# Components - 设计笔记

## custom-tabbar

自定义底部导航栏，替代微信原生 TabBar。

### 为什么自定义
- 需要中间的「添加记录」按钮弹出 ActionSheet 选择记录类型
- 原生 TabBar 不支持自定义点击行为
- 需要根据管理员角色动态显示/隐藏 Tab

### 状态同步机制
使用 500ms 轮询 `getCurrentPages()` 来检测页面切换，自动更新激活状态。

**为什么用轮询而不是事件**：微信小程序没有提供 TabBar 页面切换的全局事件回调。
页面也可以主动调用 `this.getTabBar().updateState()` 触发立即更新。

### Tab 项
| Tab | 对应页面 | 行为 |
|-----|----------|------|
| 首页 | `pages/home/index` | `wx.switchTab` |
| 添加记录 | — | 弹出 ActionSheet → `wx.navigateTo` 到对应表单页 |
| 管理 | `pages/admin/admin` | `wx.switchTab` |

### ActionSheet 选项
1. 调药记录 → `/pages/medication-record/index`
2. 发作记录 → `/pages/seizure-record/index`
3. 其他记录 → `/pages/other-record/index`
4. 📋 月度汇报 → `/pages/monthly-report/index`

## ec-canvas

ECharts 微信小程序适配组件，用于 `pages/reports/` 页面的图表渲染。

### 使用方式
```wxml
<ec-canvas id="chart" canvas-id="chart" ec="{{ ec }}"></ec-canvas>
```

```javascript
// 在 Page 的 data 中
ec: {
  onInit: function(canvas, width, height, dpr) {
    const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr })
    chart.setOption({ ... })
    return chart
  }
}
```

### 注意事项
- `echarts.min.js` 体积较大（约 500KB），已包含在组件目录中
- 如需减小包体积，可使用 ECharts 自定义构建仅保留需要的图表类型
- 图表组件不支持事件穿透，需要注意 z-index 层级
