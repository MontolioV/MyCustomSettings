if ((Get-PnpDevice -FriendlyName *webcam*).Status -eq "OK")
{
    $InstIDEnabled = Get-PnpDevice -FriendlyName *webcam*  -Status OK
    Disable-PnpDevice -InstanceId $InstIDEnabled.InstanceId -Confirm:$false
    echo "disabled"
    Start-Sleep -Seconds 1
}
else
{
    $InstIDDisabled = Get-PnpDevice -FriendlyName *webcam*  -Status Error
    Enable-PnpDevice -InstanceId $InstIDDisabled.InstanceId -Confirm:$false
    echo "enabled"
    Start-Sleep -Seconds 1
}
