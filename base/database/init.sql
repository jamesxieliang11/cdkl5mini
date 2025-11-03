-- 希舞之家小程序数据库表结构设计
-- 创建时间: 2025-09-03

-- 1. 用户表
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(100) UNIQUE NOT NULL COMMENT '微信用户唯一标识',
  nickname VARCHAR(50) COMMENT '用户昵称',
  avatar_url VARCHAR(255) COMMENT '头像URL',
  role ENUM('patient', 'researcher', 'staff') DEFAULT 'patient' COMMENT '用户角色：病友家庭/科研人员/工作人员',
  phone VARCHAR(20) COMMENT '联系电话',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_openid (openid),
  INDEX idx_role (role)
) COMMENT '用户基本信息表';

-- 2. 专家表
CREATE TABLE experts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL COMMENT '专家姓名',
  title VARCHAR(100) COMMENT '职称',
  hospital VARCHAR(100) COMMENT '所属医院',
  department VARCHAR(50) COMMENT '科室',
  specialty TEXT COMMENT '研究方向/专业领域',
  clinic_time VARCHAR(200) COMMENT '门诊时间',
  contact_info VARCHAR(200) COMMENT '联系方式',
  avatar_url VARCHAR(255) COMMENT '头像URL',
  bio TEXT COMMENT '个人简介',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_department (department)
) COMMENT '专家信息表';

-- 3. 会议议程表
CREATE TABLE schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL COMMENT '议程标题',
  speaker_id INT COMMENT '讲者ID',
  speaker_name VARCHAR(50) COMMENT '讲者姓名',
  start_time DATETIME NOT NULL COMMENT '开始时间',
  end_time DATETIME NOT NULL COMMENT '结束时间',
  location VARCHAR(100) COMMENT '地点',
  description TEXT COMMENT '议程描述',
  category ENUM('keynote', 'session', 'workshop', 'break') DEFAULT 'session' COMMENT '议程类型',
  is_featured BOOLEAN DEFAULT FALSE COMMENT '是否重点推荐',
  materials_url VARCHAR(255) COMMENT '资料下载链接',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (speaker_id) REFERENCES experts(id) ON DELETE SET NULL,
  INDEX idx_start_time (start_time),
  INDEX idx_speaker (speaker_id),
  INDEX idx_category (category)
) COMMENT '会议议程表';

-- 4. 义诊科室表
CREATE TABLE departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL COMMENT '科室名称',
  description TEXT COMMENT '科室描述',
  location VARCHAR(100) COMMENT '科室位置',
  available_slots INT DEFAULT 20 COMMENT '每日可预约数量',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否开放预约',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) COMMENT '义诊科室表';

-- 5. 义诊预约表
CREATE TABLE appointments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  department_id INT NOT NULL COMMENT '科室ID',
  patient_name VARCHAR(50) NOT NULL COMMENT '患儿姓名',
  patient_age INT COMMENT '患儿年龄',
  patient_gender ENUM('male', 'female') COMMENT '患儿性别',
  symptoms TEXT COMMENT '症状描述',
  contact_phone VARCHAR(20) NOT NULL COMMENT '联系电话',
  appointment_date DATE NOT NULL COMMENT '预约日期',
  queue_number VARCHAR(10) COMMENT '排队号码',
  status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending' COMMENT '预约状态',
  notes TEXT COMMENT '备注信息',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_department (department_id),
  INDEX idx_date (appointment_date),
  INDEX idx_status (status)
) COMMENT '义诊预约表';

-- 6. 排队状态表
CREATE TABLE queues (
  id INT PRIMARY KEY AUTO_INCREMENT,
  appointment_id INT NOT NULL COMMENT '预约ID',
  department_id INT NOT NULL COMMENT '科室ID',
  queue_number VARCHAR(10) NOT NULL COMMENT '排队号码',
  current_number VARCHAR(10) COMMENT '当前叫号',
  estimated_wait_time INT COMMENT '预估等待时间(分钟)',
  queue_date DATE NOT NULL COMMENT '排队日期',
  status ENUM('waiting', 'calling', 'in_service', 'completed', 'missed') DEFAULT 'waiting' COMMENT '排队状态',
  called_at TIMESTAMP NULL COMMENT '叫号时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  INDEX idx_appointment (appointment_id),
  INDEX idx_department_date (department_id, queue_date),
  INDEX idx_queue_number (queue_number)
) COMMENT '排队状态表';

-- 7. 消息通知表
CREATE TABLE messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT COMMENT '接收用户ID，NULL表示全体用户',
  title VARCHAR(200) NOT NULL COMMENT '消息标题',
  content TEXT NOT NULL COMMENT '消息内容',
  type ENUM('announcement', 'queue_call', 'service', 'system') DEFAULT 'system' COMMENT '消息类型',
  is_read BOOLEAN DEFAULT FALSE COMMENT '是否已读',
  priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal' COMMENT '优先级',
  related_id INT COMMENT '关联ID（如预约ID、议程ID等）',
  related_type VARCHAR(50) COMMENT '关联类型',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_type (type),
  INDEX idx_created (created_at)
) COMMENT '消息通知表';

-- 8. 用户收藏表
CREATE TABLE favorites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  item_id INT NOT NULL COMMENT '收藏项目ID',
  item_type ENUM('schedule', 'expert') NOT NULL COMMENT '收藏类型：议程/专家',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_item (user_id, item_id, item_type),
  INDEX idx_user (user_id),
  INDEX idx_item (item_id, item_type)
) COMMENT '用户收藏表';

-- 9. 系统配置表
CREATE TABLE system_configs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
  config_value TEXT COMMENT '配置值',
  description VARCHAR(255) COMMENT '配置描述',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (config_key)
) COMMENT '系统配置表';

-- 10. 文件资源表
CREATE TABLE resources (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL COMMENT '文件名称',
  file_url VARCHAR(500) NOT NULL COMMENT '文件URL',
  file_type ENUM('pdf', 'doc', 'ppt', 'image', 'video', 'other') COMMENT '文件类型',
  category ENUM('meeting', 'medical', 'form', 'other') DEFAULT 'other' COMMENT '资源分类',
  description TEXT COMMENT '文件描述',
  file_size BIGINT COMMENT '文件大小(字节)',
  download_count INT DEFAULT 0 COMMENT '下载次数',
  is_public BOOLEAN DEFAULT TRUE COMMENT '是否公开',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_type (file_type)
) COMMENT '文件资源表';

-- 插入初始数据

-- 插入义诊科室
INSERT INTO departments (name, description, location, available_slots) VALUES
('神经内科', 'CDKL5相关神经系统疾病诊疗', '1楼义诊区A', 30),
('脑电图检查', '脑电图检查及报告解读', '2楼检查室', 20),
('康复科', '儿童康复训练指导', '1楼义诊区B', 25),
('营养科', '营养评估及饮食指导', '1楼义诊区C', 15);

-- 插入系统配置
INSERT INTO system_configs (config_key, config_value, description) VALUES
('emergency_phone', '400-123-4567', '紧急联系电话'),
('insurance_guide_url', 'https://example.com/insurance-guide', '医保备案指南链接'),
('conference_start_date', '2025-09-15', '大会开始日期'),
('conference_end_date', '2025-09-17', '大会结束日期'),
('queue_refresh_interval', '30', '排队状态刷新间隔(秒)');

-- 插入示例专家数据
INSERT INTO experts (name, title, hospital, department, specialty, clinic_time, bio) VALUES
('陈黎', '主任医师、教授', '北京儿童医院', '神经内科', 'CDKL5缺陷症、儿童癫痫', '周二上午、周四下午', '从事儿童神经系统疾病诊疗20余年，在CDKL5缺陷症诊断和治疗方面有丰富经验'),
('张教授', '副主任医师', '上海儿童医学中心', '神经内科', '罕见病基因诊断', '周一全天、周三上午', '专注于儿童罕见神经系统疾病的基因诊断和精准治疗'),
('李医生', '主治医师', '广州市妇女儿童医疗中心', '康复科', '儿童早期干预', '周二、周四全天', '擅长CDKL5患儿的康复训练和早期干预方案制定');

-- 插入示例议程数据
INSERT INTO schedules (title, speaker_name, start_time, end_time, location, description, category, is_featured) VALUES
('CDKL5缺陷症最新研究进展', '陈黎', '2025-09-15 09:00:00', '2025-09-15 10:00:00', '主会场', 'CDKL5缺陷症的最新研究成果和临床应用', 'keynote', TRUE),
('加奈索龙临床应用经验分享', '张教授', '2025-09-15 14:30:00', '2025-09-15 15:30:00', '分会场A', '加奈索龙在CDKL5患者中的临床应用案例', 'session', TRUE),
('早期诊疗规范', '李医生', '2025-09-15 15:30:00', '2025-09-15 16:30:00', '分会场B', 'CDKL5患儿早期识别和干预策略', 'session', FALSE),
('患者家庭支持网络建设', '社工团队', '2025-09-16 10:00:00', '2025-09-16 11:00:00', '主会场', '如何建立有效的患者家庭支持体系', 'workshop', FALSE);