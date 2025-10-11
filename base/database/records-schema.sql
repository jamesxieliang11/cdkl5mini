-- CDKL5患者记录数据表设计
-- 创建时间: 2025-10-10

-- 1. 调药记录表
CREATE TABLE medication_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  record_time DATETIME NOT NULL COMMENT '记录时间',
  weight DECIMAL(5,2) COMMENT '体重(kg)',
  side_effects TEXT COMMENT '副作用描述',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_time (user_id, record_time),
  INDEX idx_record_time (record_time)
) COMMENT '调药记录主表';

-- 2. 调药记录详情表（药物信息）
CREATE TABLE medication_details (
  id INT PRIMARY KEY AUTO_INCREMENT,
  record_id INT NOT NULL COMMENT '调药记录ID',
  medication_name VARCHAR(100) NOT NULL COMMENT '药物名称',
  dosage DECIMAL(8,2) NOT NULL COMMENT '药量',
  unit VARCHAR(20) NOT NULL COMMENT '单位(mg/g/ml/片/粒/包/滴)',
  take_time TIME NOT NULL COMMENT '服用时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (record_id) REFERENCES medication_records(id) ON DELETE CASCADE,
  INDEX idx_record (record_id),
  INDEX idx_medication (medication_name)
) COMMENT '调药记录详情表';

-- 3. 发作记录表
CREATE TABLE seizure_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  seizure_time DATETIME NOT NULL COMMENT '发作时间',
  duration INT COMMENT '持续时间(秒)',
  seizure_type ENUM('tonic', 'clonic', 'tonic_clonic', 'absence', 'myoclonic', 'atonic', 'focal', 'other') COMMENT '发作类型',
  severity ENUM('mild', 'moderate', 'severe') DEFAULT 'moderate' COMMENT '严重程度',
  triggers TEXT COMMENT '诱发因素',
  symptoms TEXT COMMENT '症状描述',
  medication_taken BOOLEAN DEFAULT FALSE COMMENT '是否使用急救药物',
  rescue_medication VARCHAR(100) COMMENT '急救药物名称',
  rescue_dosage VARCHAR(50) COMMENT '急救药物剂量',
  recovery_time INT COMMENT '恢复时间(分钟)',
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_time (user_id, seizure_time),
  INDEX idx_seizure_time (seizure_time),
  INDEX idx_type (seizure_type),
  INDEX idx_severity (severity)
) COMMENT '发作记录表';

-- 4. 其他记录表
CREATE TABLE other_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  record_type ENUM('sleep', 'mood', 'development', 'therapy', 'hospital', 'other') NOT NULL COMMENT '记录类型',
  record_time DATETIME NOT NULL COMMENT '记录时间',
  title VARCHAR(200) NOT NULL COMMENT '记录标题',
  content TEXT NOT NULL COMMENT '记录内容',
  mood_score INT COMMENT '情绪评分(1-10)',
  sleep_hours DECIMAL(4,2) COMMENT '睡眠时长(小时)',
  sleep_quality ENUM('poor', 'fair', 'good', 'excellent') COMMENT '睡眠质量',
  development_milestone VARCHAR(200) COMMENT '发育里程碑',
  therapy_type VARCHAR(100) COMMENT '治疗类型',
  therapy_duration INT COMMENT '治疗时长(分钟)',
  hospital_name VARCHAR(100) COMMENT '医院名称',
  doctor_name VARCHAR(50) COMMENT '医生姓名',
  diagnosis TEXT COMMENT '诊断结果',
  treatment_plan TEXT COMMENT '治疗方案',
  attachments JSON COMMENT '附件信息(图片/文档链接)',
  tags VARCHAR(500) COMMENT '标签(逗号分隔)',
  is_important BOOLEAN DEFAULT FALSE COMMENT '是否重要',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_time (user_id, record_time),
  INDEX idx_type_time (record_type, record_time),
  INDEX idx_record_time (record_time),
  INDEX idx_type (record_type),
  INDEX idx_important (is_important)
) COMMENT '其他记录表';

-- 5. 记录统计表（用于快速查询统计数据）
CREATE TABLE record_statistics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  stat_date DATE NOT NULL COMMENT '统计日期',
  medication_count INT DEFAULT 0 COMMENT '调药记录数',
  seizure_count INT DEFAULT 0 COMMENT '发作记录数',
  other_count INT DEFAULT 0 COMMENT '其他记录数',
  total_seizure_duration INT DEFAULT 0 COMMENT '总发作时长(秒)',
  avg_sleep_hours DECIMAL(4,2) COMMENT '平均睡眠时长',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_date (user_id, stat_date),
  INDEX idx_user (user_id),
  INDEX idx_date (stat_date)
) COMMENT '记录统计表';

-- 插入初始数据示例

-- 调药记录示例
INSERT INTO medication_records (user_id, record_time, weight, side_effects) VALUES
(1, '2025-10-10 08:00:00', 15.5, '无明显副作用'),
(1, '2025-10-09 08:00:00', 15.4, '轻微嗜睡');

-- 调药详情示例
INSERT INTO medication_details (record_id, medication_name, dosage, unit, take_time) VALUES
(1, '加奈索龙', 2.5, 'mg', '08:00:00'),
(1, '维生素D3', 400, 'IU', '08:00:00'),
(2, '加奈索龙', 2.5, 'mg', '08:00:00');

-- 发作记录示例
INSERT INTO seizure_records (user_id, seizure_time, duration, seizure_type, severity, symptoms, recovery_time) VALUES
(1, '2025-10-09 14:30:00', 120, 'tonic_clonic', 'moderate', '全身强直阵挛，意识丧失', 10),
(1, '2025-10-08 09:15:00', 45, 'focal', 'mild', '右手抽动，意识清楚', 3);

-- 其他记录示例
INSERT INTO other_records (user_id, record_type, record_time, title, content, sleep_hours, sleep_quality) VALUES
(1, 'sleep', '2025-10-10 07:00:00', '夜间睡眠记录', '昨晚睡眠较好，中途醒来1次', 9.5, 'good'),
(1, 'development', '2025-10-09 10:00:00', '发育评估', '今天宝宝能够独立坐立5分钟', NULL, NULL),
(1, 'hospital', '2025-10-08 14:00:00', '复诊记录', '定期复查，医生建议继续当前治疗方案', NULL, NULL);