; Remove the Claude Code hooks on a real uninstall (not when an update replaces the app).
!macro customUnInstall
  ${ifNot} ${isUpdated}
    ExecWait '"$INSTDIR\Giggles Pet.exe" --uninstall-hooks'
  ${endIf}
!macroend
