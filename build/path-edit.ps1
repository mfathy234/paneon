param(
  [Parameter(Mandatory = $true)][ValidateSet('Add', 'Remove')][string]$Mode,
  [Parameter(Mandatory = $true)][string]$Dir,
  [string]$KeyPath = 'Environment'
)

$ErrorActionPreference = 'Stop'
$key = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($KeyPath)
try {
  $options = [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames
  $current = [string]$key.GetValue('Path', '', $options)
  $target = $Dir.TrimEnd('\')
  $parts = @($current -split ';' | Where-Object { $_ -ne '' -and $_.TrimEnd('\') -ine $target })
  if ($Mode -eq 'Add') { $parts += $target }
  $key.SetValue('Path', ($parts -join ';'), [Microsoft.Win32.RegistryValueKind]::ExpandString)
} finally {
  $key.Close()
}
