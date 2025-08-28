// typings/index.d.ts

interface IApp {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo
    userRole?: 'patient' | 'staff' | 'researcher'
    openid?: string
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback
}

interface ScheduleItem {
  id: number
  time: string
  title: string
  speaker?: string
  speakerTitle?: string
  location?: string
  description?: string
  status: 'completed' | 'ongoing' | 'upcoming'
  statusText: string
  isFavorite: boolean
}

interface Department {
  id: string
  name: string
  doctor: string
  icon: string
  queueCount: number
  waitTime: number
}

interface PatientInfo {
  name: string
  age: string
  gender: string
  phone: string
  symptoms: string
}

interface Appointment {
  id: string
  departmentId: string
  departmentName: string
  patientName: string
  queueNumber: string
  appointmentTime: string
  status: 'waiting' | 'processing' | 'completed' | 'cancelled'
  statusText: string
}
