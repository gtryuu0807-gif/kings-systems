import { setupButtonEffects } from "./js/events/buttonEffects.js"
import { setupAuthEvents } from "./js/events/authEvents.js"
import { setupMenuEvents } from "./js/events/menuEvents.js"
import { setupPunchEvents } from "./js/events/punchEvents.js"
import { setupNoticeEvents } from "./js/events/noticeEvents.js"
import { setupEmployeeEvents } from "./js/events/employeeEvents.js"
import { setupManualAttendanceEvents } from "./js/events/manualAttendanceEvents.js"
import { setupHolidayEvents } from "./js/events/holidayEvents.js"
import { setupPaginationEvents } from "./js/events/paginationEvents.js"
import { setupFilterEvents } from "./js/events/filterEvents.js"
import { setupReportEvents } from "./js/events/reportEvents.js"
import { setupUsersChangedEvents } from "./js/events/usersChangedEvents.js"
import { setupMaintenanceEvents } from "./js/events/maintenanceEvents.js"
import { setInitialRangeDisplay } from "./js/events/rangeInputs.js"

import {
    setupAdminTabs,
    setupMainTabs
} from "./js/ui.js"

import { watchLoginState } from "./js/auth.js"

setupButtonEffects()
setupAuthEvents()
setupMenuEvents()
setupPunchEvents()
setupNoticeEvents()
setupEmployeeEvents()
setupManualAttendanceEvents()
setupHolidayEvents()
setupPaginationEvents()
setupFilterEvents()
setupReportEvents()
setupUsersChangedEvents()
setupMaintenanceEvents()

setupMainTabs()
setupAdminTabs()
setInitialRangeDisplay()
watchLoginState()
