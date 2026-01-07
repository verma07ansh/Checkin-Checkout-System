export interface User {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  branch?: string;
  year?: string;
  section?: string;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  time?: string;
  description: string;
  status: 'active' | 'completed';
  passTemplateURL: string;
  qrPosition: {
    x: number;
    y: number;
    size: number;
    rotation?: number;
  };
  namePosition?: {
    x: number;
    y: number;
    size: number;
    color: string;
    font?: string;
    rotation?: number;
  };
  createdAt: any; // Using any for Firestore Timestamp compatibility across client/server
}

export interface EventUser {
  id: string;
  name: string;
  email: string;
  branch: string;
  year: string;
  section: string;
  qrCode: string;
  passURL: string;
  passTemplateURL?: string; // Legacy check
  passConfigHash?: string; // New robust check
  emailSent: boolean;
  verificationToken: string;
}

export interface AttendanceRecord {
  checkInTime: any;
  checkOutTime?: any;
}
