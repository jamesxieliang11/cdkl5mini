-- 数据库迁移脚本：为发作记录表添加图片字段支持
-- 创建时间: 2025-11-03
-- 说明: 为现有的 seizure_records 表添加 images 字段以支持图片上传功能

-- 1. 为发作记录表添加图片字段
ALTER TABLE seizure_records 
ADD COLUMN images JSON COMMENT '相关图片信息(包含fileID、cloudPath、uploadTime等)' 
AFTER notes;

-- 2. 为现有记录设置默认值（空数组）
UPDATE seizure_records 
SET images = JSON_ARRAY() 
WHERE images IS NULL;

-- 3. 验证迁移结果
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN images IS NOT NULL THEN 1 END) as records_with_images_field,
  COUNT(CASE WHEN JSON_LENGTH(images) > 0 THEN 1 END) as records_with_actual_images
FROM seizure_records;

-- 4. 显示表结构确认
DESCRIBE seizure_records;