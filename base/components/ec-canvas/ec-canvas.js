// 引入echarts
const echarts = require('../../node_modules/echarts/dist/echarts.min.js');

let ctx;

Component({
  properties: {
    canvasId: {
      type: String,
      value: 'ec-canvas'
    },
    ec: {
      type: Object
    },
    forceUseOldCanvas: {
      type: Boolean,
      value: false
    }
  },

  data: {},

  ready: function () {
    if (!this.data.ec) {
      console.warn('组件需绑定 ec 变量，例：<ec-canvas id="mychart-dom-bar" canvas-id="mychart-bar" ec="{{ ec }}"></ec-canvas>');
      return;
    }

    if (!this.data.ec.lazyLoad) {
      this.init();
    }
  },

  methods: {
    init: function (callback) {
      const version = wx.getSystemInfoSync().SDKVersion;
      const canUseNewCanvas = wx.compareVersion(version, '2.9.0') >= 0;
      const forceUseOldCanvas = this.data.forceUseOldCanvas;
      const isUseNewCanvas = canUseNewCanvas && !forceUseOldCanvas;

      if (forceUseOldCanvas && canUseNewCanvas) {
        console.warn('开发者强制使用旧canvas,建议关闭');
      }

      if (isUseNewCanvas) {
        const query = wx.createSelectorQuery().in(this);
        query
          .select('.ec-canvas')
          .fields({ node: true, size: true })
          .exec((res) => {
            const canvasNode = res[0].node;
            const canvasContext = canvasNode.getContext('2d');

            const canvas = new WxCanvas(canvasContext, this.data.canvasId, true, canvasNode);
            echarts.setCanvasCreator(() => canvas);

            if (typeof callback === 'function') {
              this.chart = callback(canvas, res[0].width, res[0].height, echarts);
            } else if (this.data.ec && typeof this.data.ec.onInit === 'function') {
              this.chart = this.data.ec.onInit(canvas, res[0].width, res[0].height, echarts);
            } else {
              this.triggerEvent('init', {
                canvas: canvas,
                width: res[0].width,
                height: res[0].height,
                echarts: echarts
              });
            }
          });
      } else {
        ctx = wx.createCanvasContext(this.data.canvasId, this);
        const canvas = new WxCanvas(ctx, this.data.canvasId, false);
        echarts.setCanvasCreator(() => canvas);

        const query = wx.createSelectorQuery().in(this);
        query.select('.ec-canvas').boundingClientRect(res => {
          if (typeof callback === 'function') {
            this.chart = callback(canvas, res.width, res.height, echarts);
          } else if (this.data.ec && typeof this.data.ec.onInit === 'function') {
            this.chart = this.data.ec.onInit(canvas, res.width, res.height, echarts);
          } else {
            this.triggerEvent('init', {
              canvas: canvas,
              width: res.width,
              height: res.height,
              echarts: echarts
            });
          }
        }).exec();
      }
    },

    canvasToTempFilePath(opt) {
      if (!opt.canvasId) {
        opt.canvasId = this.data.canvasId;
      }
      ctx.draw(true, () => {
        wx.canvasToTempFilePath(opt, this);
      });
    },

    touchStart(e) {
      if (this.chart && e.touches.length > 0) {
        const touch = e.touches[0];
        const handler = this.chart.getZr().handler;
        handler.dispatch('mousedown', {
          zrX: touch.x,
          zrY: touch.y
        });
        handler.dispatch('mousemove', {
          zrX: touch.x,
          zrY: touch.y
        });
        handler.processGesture(wrapTouch(e), 'start');
      }
    },

    touchMove(e) {
      if (this.chart && e.touches.length > 0) {
        const touch = e.touches[0];
        const handler = this.chart.getZr().handler;
        handler.dispatch('mousemove', {
          zrX: touch.x,
          zrY: touch.y
        });
        handler.processGesture(wrapTouch(e), 'change');
      }
    },

    touchEnd(e) {
      if (this.chart) {
        const touch = e.changedTouches ? e.changedTouches[0] : {};
        const handler = this.chart.getZr().handler;
        handler.dispatch('mouseup', {
          zrX: touch.x,
          zrY: touch.y
        });
        handler.dispatch('click', {
          zrX: touch.x,
          zrY: touch.y
        });
        handler.processGesture(wrapTouch(e), 'end');
      }
    }
  }
});

function wrapTouch(event) {
  for (let i = 0; i < event.touches.length; ++i) {
    const touch = event.touches[i];
    touch.offsetX = touch.x;
    touch.offsetY = touch.y;
  }
  return event;
}

function WxCanvas(ctx, canvasId, isNew, canvasNode) {
  this.ctx = ctx;
  this.canvasId = canvasId;
  this.chart = null;
  this.isNew = isNew;
  
  if (isNew) {
    this.canvasNode = canvasNode;
  } else {
    this._initStyle(ctx);
  }

  this._initCanvas(ctx, canvasId);
  this._initEvent();
}

WxCanvas.prototype._initCanvas = function (ctx, canvasId) {
  ctx.createCircularGradient = ctx.createRadialGradient;
};

WxCanvas.prototype._initStyle = function (ctx) {
  ctx.createRadialGradient = ctx.createCircularGradient;
};

WxCanvas.prototype._initEvent = function () {
  this.event = {};
};

WxCanvas.prototype.attachEvent = function (callback) {
  this.chart = callback;
};

WxCanvas.prototype.detachEvent = function () {
  this.chart = null;
};