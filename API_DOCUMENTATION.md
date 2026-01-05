# 📚 SHARPLOOK BACKEND - API DOCUMENTATION

## 🌐 Base URL
```
Development: http://localhost:5000/api/v1
Production:  https://api.sharplook.com/api/v1
```

## 🔐 Authentication
All protected endpoints require Bearer token authentication:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 TABLE OF CONTENTS

1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Categories](#categories)
4. [Services](#services)
5. [Bookings](#bookings)
6. [Payments](#payments)
7. [Disputes](#disputes)
8. [Reviews](#reviews)
9. [Chat](#chat)
10. [Notifications](#notifications)
11. [Referrals](#referrals)
12. [Analytics](#analytics)

---

## 1. AUTHENTICATION

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+2348012345678",
  "password": "SecurePass123!",
  "isVendor": false
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

### Verify Email
```http
POST /auth/verify-email
Content-Type: application/json

{
  "token": "verification_token_here"
}
```

### Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_here",
  "password": "NewSecurePass123!"
}
```

### Refresh Token
```http
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

---

## 2. USER MANAGEMENT

### Get Current User Profile
```http
GET /users/me
Authorization: Bearer <token>
```

### Update Profile
```http
PUT /users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+2348012345678",
  "address": {
    "street": "123 Main St",
    "city": "Lagos",
    "state": "Lagos",
    "country": "Nigeria"
  }
}
```

### Upload Avatar
```http
POST /users/me/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

avatar: <file>
```

### Change Password
```http
PUT /users/me/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

### Setup Vendor Profile
```http
POST /users/vendor/setup
Authorization: Bearer <token>
Content-Type: application/json

{
  "businessName": "John's Services",
  "businessDescription": "Professional service provider",
  "serviceCategories": ["category_id_1", "category_id_2"],
  "location": {
    "coordinates": [3.3792, 6.5244],
    "address": "Lagos, Nigeria"
  }
}
```

### Get Wallet Balance
```http
GET /users/me/wallet
Authorization: Bearer <token>
```

---

## 3. CATEGORIES

### Get All Categories
```http
GET /categories?page=1&limit=20
```

### Get Category by ID
```http
GET /categories/:categoryId
```

### Create Category (Admin)
```http
POST /categories
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Home Cleaning",
  "description": "Professional home cleaning services",
  "icon": "cleaning"
}
```

### Update Category (Admin)
```http
PUT /categories/:categoryId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "isActive": true
}
```

---

## 4. SERVICES

### Search Services
```http
GET /services/search?
  query=cleaning&
  category=category_id&
  minPrice=1000&
  maxPrice=50000&
  city=Lagos&
  rating=4&
  page=1&
  limit=20
```

### Get Service by ID
```http
GET /services/:serviceId
```

### Create Service (Vendor)
```http
POST /services
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "name": "Professional Home Cleaning",
  "description": "Complete home cleaning service",
  "category": "category_id",
  "basePrice": 15000,
  "priceType": "fixed",
  "currency": "NGN",
  "duration": 120,
  "serviceArea": {
    "type": "Point",
    "coordinates": [3.3792, 6.5244],
    "radius": 10000
  }
}
```

### Update Service
```http
PUT /services/:serviceId
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "name": "Updated Service Name",
  "basePrice": 20000
}
```

### Upload Service Images
```http
POST /services/:serviceId/images
Authorization: Bearer <vendor_token>
Content-Type: multipart/form-data

images: <files>
```

---

## 5. BOOKINGS

### Create Standard Booking
```http
POST /bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "service": "service_id",
  "bookingType": "standard",
  "scheduledDate": "2025-11-15T10:00:00Z",
  "location": {
    "type": "Point",
    "coordinates": [3.3792, 6.5244],
    "address": "123 Main St, Lagos"
  },
  "notes": "Please bring cleaning supplies"
}
```

### Send Offer (Client → Vendor)
```http
POST /bookings/send-offer
Authorization: Bearer <client_token>
Content-Type: application/json

{
  "vendor": "vendor_id",
  "service": "service_id",
  "proposedPrice": 25000,
  "proposedDate": "2025-11-15T10:00:00Z",
  "message": "Can you do this on Monday?",
  "location": {
    "type": "Point",
    "coordinates": [3.3792, 6.5244],
    "address": "123 Main St, Lagos"
  }
}
```

### Accept/Reject Booking
```http
POST /bookings/:bookingId/respond
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "action": "accept",
  "message": "I'll be there on time!"
}
```

### Start Service
```http
POST /bookings/:bookingId/start
Authorization: Bearer <vendor_token>
```

### Complete Booking
```http
POST /bookings/:bookingId/complete
Authorization: Bearer <vendor_token>
```

### Cancel Booking
```http
POST /bookings/:bookingId/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Unable to attend"
}
```

---

## 6. PAYMENTS

### Initialize Payment
```http
POST /payments/initialize
Authorization: Bearer <token>
Content-Type: application/json

{
  "booking": "booking_id",
  "amount": 15000
}
```

### Verify Payment
```http
POST /payments/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "reference": "paystack_reference"
}
```

### Get Payment History
```http
GET /payments/my-payments?page=1&limit=20
Authorization: Bearer <token>
```

### Request Withdrawal
```http
POST /payments/withdraw
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "amount": 50000,
  "bankDetails": {
    "accountNumber": "0123456789",
    "accountName": "John Doe",
    "bankName": "GTBank",
    "bankCode": "058"
  }
}
```

---

## 7. DISPUTES

### Create Dispute
```http
POST /disputes
Authorization: Bearer <token>
Content-Type: application/json

{
  "booking": "booking_id",
  "category": "service_quality",
  "description": "Service was not completed as agreed",
  "requestedResolution": "full_refund"
}
```

### Add Evidence
```http
POST /disputes/:disputeId/evidence
Authorization: Bearer <token>
Content-Type: multipart/form-data

files: <files>
description: "Photos of incomplete work"
```

### Respond to Dispute
```http
POST /disputes/:disputeId/respond
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "I completed the work as agreed"
}
```

### Resolve Dispute (Admin)
```http
POST /disputes/:disputeId/resolve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "resolution": "partial_refund",
  "refundAmount": 7500,
  "adminNotes": "Both parties share responsibility"
}
```

---

## 8. REVIEWS

### Create Review
```http
POST /reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "booking": "booking_id",
  "reviewee": "vendor_id",
  "reviewerType": "client",
  "rating": 5,
  "comment": "Excellent service!",
  "detailedRatings": {
    "quality": 5,
    "timeliness": 5,
    "communication": 5,
    "professionalism": 5,
    "valueForMoney": 5
  }
}
```

### Get Service Reviews
```http
GET /reviews/service/:serviceId?page=1&limit=20
```

### Get User Reviews
```http
GET /reviews/user/:userId?page=1&limit=20
```

### Respond to Review
```http
POST /reviews/:reviewId/respond
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "response": "Thank you for your feedback!"
}
```

---

## 9. CHAT

### Create/Get Conversation
```http
POST /chat/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "otherUserId": "user_id",
  "bookingId": "booking_id"
}
```

### Get Conversations
```http
GET /chat/conversations?page=1&limit=20
Authorization: Bearer <token>
```

### Get Messages
```http
GET /chat/conversations/:conversationId/messages?page=1&limit=50
Authorization: Bearer <token>
```

### Send Message
```http
POST /chat/conversations/:conversationId/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Hello! What time will you arrive?",
  "messageType": "text"
}
```

### Mark as Read
```http
PUT /chat/conversations/:conversationId/read
Authorization: Bearer <token>
```

### Search Messages
```http
GET /chat/search?query=time&page=1
Authorization: Bearer <token>
```

---

## 10. NOTIFICATIONS

### Register Device
```http
POST /notifications/register-device
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "fcm_device_token",
  "deviceType": "android",
  "deviceName": "Samsung Galaxy S21"
}
```

### Get Notifications
```http
GET /notifications?page=1&limit=20&isRead=false
Authorization: Bearer <token>
```

### Mark as Read
```http
PUT /notifications/:notificationId/read
Authorization: Bearer <token>
```

### Mark All as Read
```http
PUT /notifications/read-all
Authorization: Bearer <token>
```

### Get Unread Count
```http
GET /notifications/unread-count
Authorization: Bearer <token>
```

### Update Settings
```http
PUT /notifications/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "notificationsEnabled": true,
  "emailNotifications": false,
  "pushNotifications": true
}
```

---

## 11. REFERRALS

### Apply Referral Code
```http
POST /referrals/apply
Authorization: Bearer <token>
Content-Type: application/json

{
  "referralCode": "JOHN2025"
}
```

### Get My Stats
```http
GET /referrals/stats
Authorization: Bearer <token>
```

### Get My Referrals
```http
GET /referrals/my-referrals?page=1&status=completed
Authorization: Bearer <token>
```

### Get Leaderboard
```http
GET /referrals/leaderboard?limit=10
```

---

## 12. ANALYTICS (Admin Only)

### Dashboard Overview
```http
GET /analytics/dashboard
Authorization: Bearer <admin_token>
```

### User Analytics
```http
GET /analytics/users?startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer <admin_token>
```

### Booking Analytics
```http
GET /analytics/bookings?startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer <admin_token>
```

### Revenue Analytics
```http
GET /analytics/revenue?startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer <admin_token>
```

### Vendor Performance
```http
GET /analytics/vendors?vendorId=vendor_id
Authorization: Bearer <admin_token>
```

### Export Data
```http
GET /analytics/export/bookings?startDate=2025-01-01
Authorization: Bearer <admin_token>
```

---

## 📊 RESPONSE FORMATS

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data here
  },
  "timestamp": "2025-11-11T10:30:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  },
  "timestamp": "2025-11-11T10:30:00Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved",
  "data": [
    // Array of items
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "pageSize": 20,
      "totalItems": 200,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "timestamp": "2025-11-11T10:30:00Z"
}
```

---

## 🔒 HTTP STATUS CODES

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

---

## 🚀 RATE LIMITING

- Standard users: 100 requests/15 minutes
- Vendors: 200 requests/15 minutes
- Admin: 500 requests/15 minutes

---

## 📝 NOTES

1. All dates should be in ISO 8601 format
2. Coordinates are [longitude, latitude]
3. Currency is NGN (Nigerian Naira)
4. File uploads limited to 10MB
5. Maximum 5 images per service

---

**Version:** 1.0.0  
**Last Updated:** November 11, 2025  
**Total Endpoints:** 142
