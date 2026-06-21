; Arabic assisted-installer strings (LCID 1025) + load Arabic MUI after default addLangs
!macro customHeader
  !insertmacro MUI_LANGUAGE "Arabic"
!macroend

!define ARABIC_LCID 1025

LangString chooseInstallationOptions ${ARABIC_LCID} "خيارات التثبيت"
LangString chooseUninstallationOptions ${ARABIC_LCID} "خيارات إزالة التثبيت"
LangString whichInstallationShouldBeRemoved ${ARABIC_LCID} "أي نسخة تريد إزالتها؟"
LangString whoShouldThisApplicationBeInstalledFor ${ARABIC_LCID} "لمن يُثبَّت هذا البرنامج؟"
LangString selectUserMode ${ARABIC_LCID} "اختر: هل يكون البرنامج متاحاً لجميع مستخدمي الجهاز أم لك فقط؟"
LangString whichInstallationRemove ${ARABIC_LCID} "البرنامج مثبت للجميع وللمستخدم الحالي.$\r$\nأي نسخة تريد إزالتها؟"
LangString freshInstallForAll ${ARABIC_LCID} "تثبيت جديد لجميع المستخدمين (يتطلب صلاحيات المسؤول)"
LangString freshInstallForCurrent ${ARABIC_LCID} "تثبيت جديد للمستخدم الحالي فقط"
LangString onlyForMe ${ARABIC_LCID} "لي &فقط"
LangString forAll ${ARABIC_LCID} "لجميع مستخدمي هذا الجهاز (&الكل)"
LangString loginWithAdminAccount ${ARABIC_LCID} "يجب تسجيل الدخول بحساب مسؤول للمتابعة..."
LangString perUserInstallExists ${ARABIC_LCID} "يوجد تثبيت سابق للمستخدم الحالي."
LangString perUserInstall ${ARABIC_LCID} "يوجد تثبيت للمستخدم الحالي."
LangString perMachineInstallExists ${ARABIC_LCID} "يوجد تثبيت سابق لجميع المستخدمين."
LangString perMachineInstall ${ARABIC_LCID} "يوجد تثبيت لجميع المستخدمين."
LangString reinstallUpgrade ${ARABIC_LCID} "سيتم إعادة التثبيت/التحديث."
LangString uninstall ${ARABIC_LCID} "سيتم إزالة التثبيت."
