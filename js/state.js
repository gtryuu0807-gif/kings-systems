export const pageSize = 5

export const state = {
    allRecords: [],
    allNotices: [],
    allUsers: [],
    allHolidays: [],

    maintenanceSettings: null,
    maintenanceUnsubscribe: null,

    currentPage: 0,
    adminCurrentPage: 0,

    currentUserRole: "employee",

    isLoginBusy: false,
    isPunchBusy: false,
    isDeleteBusy: false,
    isNoticeBusy: false,
    isEmployeeBusy: false
}
