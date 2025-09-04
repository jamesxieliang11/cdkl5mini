# CDKL5大会小程序数据库设计

## 概述

本文档描述了CDKL5大会轻量化小程序的数据库设计，包括表结构、索引和初始数据。

## 数据库类型

- **传统关系型数据库**: 使用 `init.sql` 文件
- **微信小程序云开发**: 使用 `collections.json` 和 `init-data.js` 文件

## 数据库集合/表结构

### 1. users (用户表)
存储用户基本信息和角色设置
- `openid`: 微信用户唯一标识
- `role`: 用户角色 (patient/researcher/staff)
- `nickname`, `avatar_url`: 用户基本信息
- `phone`: 联系电话

### 2. experts (专家表)
存储专家信息和联系方式
- `name`, `title`, `hospital`: 专家基本信息
- `department`, `specialty`: 科室和专业领域
- `clinic_time`: 门诊时间
- `bio`: 个人简介

### 3. schedules (会议议程表)
存储会议日程安排
- `title`, `speaker_name`: 议程标题和讲者
- `start_time`, `end_time`: 时间安排
- `location`: 地点
- `category`: 议程类型 (keynote/session/workshop/break)
- `is_featured`: 是否重点推荐

### 4. departments (义诊科室表)
存储义诊科室信息
- `name`, `description`: 科室名称和描述
- `location`: 科室位置
- `available_slots`: 每日可预约数量
- `is_active`: 是否开放预约

### 5. appointments (义诊预约表)
存储义诊预约信息
- `user_id`, `department_id`: 关联用户和科室
- `patient_name`, `patient_age`: 患儿信息
- `symptoms`: 症状描述
- `appointment_date`: 预约日期
- `queue_number`: 排队号码
- `status`: 预约状态

### 6. queues (排队状态表)
存储实时排队状态
- `appointment_id`: 关联预约
- `queue_number`: 排队号码
- `current_number`: 当前叫号
- `estimated_wait_time`: 预估等待时间
- `status`: 排队状态

### 7. messages (消息通知表)
存储系统消息和通知
- `user_id`: 接收用户 (NULL表示全体用户)
- `title`, `content`: 消息标题和内容
- `type`: 消息类型 (announcement/queue_call/service/system)
- `is_read`: 是否已读
- `priority`: 优先级

### 8. favorites (用户收藏表)
存储用户收藏的议程和专家
- `user_id`: 用户ID
- `item_id`: 收藏项目ID
- `item_type`: 收藏类型 (schedule/expert)

### 9. system_configs (系统配置表)
存储系统配置参数
- `config_key`: 配置键
- `config_value`: 配置值
- `description`: 配置描述

### 10. resources (文件资源表)
存储可下载的文件资源
- `name`: 文件名称
- `file_url`: 文件URL
- `file_type`: 文件类型 (pdf/doc/ppt/image/video)
- `category`: 资源分类 (meeting/medical/form)
- `download_count`: 下载次数

## 使用说明

### 微信小程序云开发初始化

1. 在微信开发者工具中打开云开发控制台
2. 创建数据库集合（参考 `collections.json`）
3. 在云函数中运行 `init-data.js` 初始化数据

### 传统数据库初始化

1. 创建数据库
2. 执行 `init.sql` 文件创建表结构和初始数据

## 索引设计

为提高查询性能，已为以下字段创建索引：
- 用户表: `openid` (唯一), `role`
- 专家表: `name`, `department`
- 议程表: `start_time`, `speaker_id`, `category`, `is_featured`
- 预约表: `user_id`, `department_id`, `appointment_date`, `status`
- 排队表: `appointment_id`, `department_id + queue_date`, `queue_number`
- 消息表: `user_id`, `type`, `created_at`, `is_read`

## 数据安全

- 患儿姓名等敏感信息需要脱敏处理
- 用户数据采用HTTPS传输
- 定期备份重要数据