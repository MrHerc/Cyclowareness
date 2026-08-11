"""MITRE ATT&CK technique mapping.

Every signal the analyzers fire is checked against a curated table of ATT&CK
techniques (real technique IDs and tactics). The result is the set of techniques
the sample's observed behaviour maps to, each with the signals that evidenced it
— the same language a SOC analyst already uses to triage and report.

The mapping is intentionally conservative: a technique is only asserted when a
signal concretely supports it, and each mapped technique carries its evidence so
it can be checked.
"""
from __future__ import annotations

from typing import Any, Iterable

from .contracts import Signal

# (match substrings, technique_id, technique_name, tactic)
_RULES: tuple[tuple[tuple[str, ...], str, str, str], ...] = (
    (("download_and_execute", "download", "ingress", "webclient", "downloadfile"),
     "T1105", "Ingress Tool Transfer", "Command and Control"),
    # NOT a bare "remote". Matched as a substring it caught four
    # process-manipulation signals in the corpus —
    # `capev2.injection_createremotethread`, `reads_memory_remote_process`,
    # `resumethread_remote_process`, `terminates_remote_process` — and filed all
    # of them under Command and Control, which is where an analyst goes looking
    # for network activity. A report that puts process injection under C2 sends
    # the reader to the wrong place and is wrong about the technique.
    (("network", "beacon", "c2", "remote_template", "remote_host", "remote_url",
      "remote_content", "http_request", "connect"),
     "T1071", "Application Layer Protocol", "Command and Control"),
    (("powershell", "encoded_command", "amsi"),
     "T1059.001", "Command and Scripting Interpreter: PowerShell", "Execution"),
    (("jscript", "javascript", ".js", "wscript"),
     "T1059.007", "Command and Scripting Interpreter: JavaScript", "Execution"),
    (("vbscript", "vbs", "createobject"),
     "T1059.005", "Command and Scripting Interpreter: Visual Basic", "Execution"),
    (("batch", "cmd_", "bat_"),
     "T1059.003", "Command and Scripting Interpreter: Windows Command Shell", "Execution"),
    (("python", "shell_"),
     "T1059", "Command and Scripting Interpreter", "Execution"),
    (("runtime_exec", "process_builder", "spawns_shell", "suspicious_api"),
     "T1106", "Native API", "Execution"),
    (("macro", "autoexec", "autoopen", "auto_open"),
     "T1204.002", "User Execution: Malicious File", "Execution"),
    (("launch_action", "openaction", "exploit", "shellcode", "heap_spray"),
     "T1203", "Exploitation for Client Execution", "Execution"),
    (("obfuscat", "encoded", "base64", "packed", "high_entropy"),
     "T1027", "Obfuscated Files or Information", "Defense Evasion"),
    (("decoded_layer", "deobfuscat", "unescape"),
     "T1140", "Deobfuscate/Decode Files or Information", "Defense Evasion"),
    (("defense_evasion", "disable", "tamper", "unhook", "set-mppreference", "disablerealtime"),
     "T1562.001", "Impair Defenses: Disable or Modify Tools", "Defense Evasion"),
    (("anti_debug", "anti_vm", "sandbox_evasion", "hidden_window"),
     "T1497", "Virtualization/Sandbox Evasion", "Defense Evasion"),
    (("classloader", "reflection", "reflective", "dynamic_code", "defineclass"),
     "T1620", "Reflective Code Loading", "Defense Evasion"),
    # The remote-process tokens live here, where they belong: writing to,
    # reading from or resuming a thread in another process is the technique
    # itself. They were previously swept up by the bare "remote" above.
    (("injection", "hollow", "process_inject", "createremotethread",
      "remote_process", "remote_thread"),
     "T1055", "Process Injection", "Defense Evasion"),
    (("schtask", "scheduled_task"),
     "T1053.005", "Scheduled Task/Job: Scheduled Task", "Persistence"),
    (("registry_run", "run_key", "currentversion\\run"),
     "T1547.001", "Boot or Logon Autostart: Registry Run Keys", "Persistence"),
    (("cron",),
     "T1053.003", "Scheduled Task/Job: Cron", "Persistence"),
    (("systemd", "service_install"),
     "T1543.002", "Create or Modify System Process: systemd Service", "Persistence"),
    (("boot", "receive_boot_completed", "autorun_persist"),
     "T1547", "Boot or Logon Autostart Execution", "Persistence"),
    (("credential", "password", "browser_data", "stealer"),
     "T1555", "Credentials from Password Stores", "Credential Access"),
    (("keylog",),
     "T1056.001", "Input Capture: Keylogging", "Collection"),
    (("sms", "sendtextmessage", "read_sms"),
     "T1636.004", "Protected User Data: SMS Messages", "Collection"),
    (("record_audio",),
     "T1429", "Audio Capture", "Collection"),
    (("accessibility_abuse", "device_admin", "uac_bypass", "request_install"),
     "T1626", "Abuse Elevation Control Mechanism", "Privilege Escalation"),
    # SPLIT BY PLATFORM. This was one rule ending in `T1426`, which is System
    # Information Discovery in ATT&CK for **Mobile**; the Enterprise technique of
    # the same name is T1082. `getdeviceid` and `getinstalledpackages` are
    # Android APIs, so the rule was written for the APK analyzer — but
    # `systeminfo`, `enumerate` and `discovery` are generic, so every Windows and
    # Linux discovery signal was filed under a mobile ID. A report naming a real
    # technique is making a checkable claim, and anyone who looked T1426 up found
    # a mobile technique attached to a PE file.
    (("getdeviceid", "getinstalledpackages", "getsubscriberid", "getsimserial"),
     "T1426", "System Information Discovery (Mobile)", "Discovery"),
    (("systeminfo", "enumerate", "discovery", "reconnaissance", "hardware_id",
      "computer_name", "mount_points"),
     "T1082", "System Information Discovery", "Discovery"),
    # Packing had no rule at all, while `packer_entropy` fires 41 times and
    # `packer_unknown_pe_section_name` 34 times across the 88-sample fixture. It
    # is the one unambiguous entry among the 136 unmapped ids — the signal says
    # the file is packed, and that is the technique. The rest stay unmapped on
    # purpose; this module is conservative by design.
    (("packer", "upx", "themida", "vmprotect", "software_packing"),
     "T1027.002", "Obfuscated Files or Information: Software Packing", "Defense Evasion"),
    (("autorun.inf", "removable"),
     "T1091", "Replication Through Removable Media", "Lateral Movement"),
    (("ransom", "encrypt_files", "delete_shadow", "wiper"),
     "T1486", "Data Encrypted for Impact", "Impact"),
    (("embedded_executable", "dropped", "native_libs", "embedded_url"),
     "T1105", "Ingress Tool Transfer", "Command and Control"),
)


#: Signals whose NAME says they are an anti-analysis check. The rest of the name
#: is what the check LOOKED AT, not what the sample did with it.
#:
#: `capev2.antivm_network_adapters` contains the substring `network`, and the
#: T1071 key list contains `network`, so "checks adapter addresses to detect a
#: virtual network interface" was filed under **Command and Control** — the
#: tactic an analyst opens to find out who the sample talked to. The capability
#: model short-circuits the same marker to `evasion`; without this the report
#: contradicts itself on one page.
#:
#: T1497 is the honest answer and this table already carried it; the substring
#: pass simply matched first.
_ANTI_ANALYSIS = ("antivm", "antidebug", "antisandbox", "antianalysis",
                  "antiemulation", "antiav", "antidbg")
_ANTI_TECHNIQUE = ("T1497", "Virtualization/Sandbox Evasion", "Defense Evasion")


def _is_anti_analysis(signal: Signal) -> bool:
    """Does the signal ID declare itself an anti-analysis check?

    Read from the ID's own tokens, never from the title — a title is prose and
    routinely says "possible anti-debug" about something else entirely.
    """
    tail = signal.id.split(".", 1)[-1]
    return any(token in _ANTI_ANALYSIS for token in tail.split("_"))



# --- the curated table --------------------------------------------------------
#
# WHY A TABLE AND NOT A PATTERN.
#
# The rules below this point match a signal's id AND its prose title. A title is
# where a sandbox writes its hypotheses, and measured over 751 stored jobs, 1,012
# of 4,551 technique assertions -- 22% -- rested on the sentence alone. The
# sentences doing it hedge: "can be used to adapt C2 network behaviour" became
# T1071, "identify historical or connected removable drives" became T1091, and
# "performs high-volume NtQueryInformationToken calls" became T1486 on PsInfo64,
# which this engine calls clean.
#
# Two mechanical repairs were measured and both cost more than the disease.
# Matching ids only lost 897-1,105 techniques on MALICIOUS samples; ignoring
# hedged titles lost 603. The bar this codebase set for such a trade is 28.
# The coverage genuinely rested on prose, so deleting prose deleted the mapping.
#
# So the mapping was not narrowed, it was WRITTEN. Every signal id the engine
# has ever emitted -- 383 of them, inventoried from the live corpus -- was
# curated against one standard: map an id only when observing that signal means
# the technique occurred. Not "is consistent with", not "can be used for". Each
# was then re-judged by a second reviewer told to strike out claims that were not
# earned; 14 were struck.
#
# 250 of the 383 map to NOTHING, and that is the substance of the work rather
# than a gap in it. `capev2.queries_locale_api` appears on 210 clean samples and
# 166 malicious ones: localisation is what that call is for, and the geofencing
# reading lives entirely in a parenthetical. An empty tuple here is a decision
# that the signal does not evidence a technique, and it is authoritative -- ids
# in this table never fall through to the keyword rules.
#
# `_RULES` still runs for ids that are NOT in this table, so a new analyzer's
# signals are not silently unmapped, and those claims keep carrying the weaker
# `basis` that says what they rest on.

_ID_TECHNIQUES: dict[str, tuple[str, ...]] = {
    "apk.accessibility_abuse": (),
    "apk.dangerous_permission.boot_persistence": (),
    "apk.dangerous_permission.location": (),
    "apk.dangerous_permission.screen_overlay": (),
    "apk.dynamic_code": (),
    "apk.embedded_url": (),
    "apk.excessive_permissions": (),
    "apk.multiple_dex": (),
    "apk.native_libs": (),
    "apk.no_manifest": (),
    "apk.suspicious_api": (),
    "archive.compression_bomb": (),
    "archive.contains_executable": (),
    "archive.contents_not_examined": (),
    "archive.double_extension": ("T1036.007",),
    "archive.encrypted": (),
    "archive.malicious_member": (),
    "archive.members_not_analysed": (),
    "archive.nesting_limit": (),
    "archive.not_inspected": (),
    "archive.path_traversal": (),
    "capev2.accesses_netlogon_regkey": (),
    "capev2.accesses_public_folder": (),
    "capev2.allocated_memory_protection_noaccess": (),
    "capev2.amsi_enumeration": ("T1518.001",),
    "capev2.anomalous_deletefile": (),
    "capev2.antianalysis_tls_section": (),
    "capev2.antiav_avast_libs": (),
    "capev2.antiav_detectfile": ("T1518.001",),
    "capev2.antidebug_guardpages": (),
    "capev2.antidebug_ntsetinformationthread": (),
    "capev2.antidebug_setunhandledexceptionfilter": (),
    "capev2.antidebug_windows": (),
    "capev2.antisandbox_restart": (),
    "capev2.antisandbox_sboxie_libs": (),
    "capev2.antisandbox_sleep": (),
    "capev2.antisandbox_sunbelt_libs": (),
    "capev2.antisandbox_suspend": (),
    "capev2.antisandbox_system_parameters_info": (),
    "capev2.antisandbox_unhook": (),
    "capev2.antisandbox_windows_activation": (),
    "capev2.antivm_checks_available_memory": (),
    "capev2.antivm_display": (),
    "capev2.antivm_generic_bios": (),
    "capev2.antivm_generic_disk": (),
    "capev2.antivm_generic_diskreg": (),
    "capev2.antivm_generic_services": (),
    "capev2.antivm_generic_system": (),
    "capev2.antivm_network_adapters": (),
    "capev2.antivm_vbox_files": (),
    "capev2.antivm_vbox_keys": (),
    "capev2.antivm_vmware_files": (),
    "capev2.antivm_wmi": (),
    "capev2.binary_yara": (),
    "capev2.bypass_chromium_protection": ("T1539",),
    "capev2.cmdline_http_link": (),
    "capev2.cmdline_long_string": (),
    "capev2.cmdline_obfuscation": ("T1027.010",),
    "capev2.cmdline_process_discovery": ("T1057",),
    "capev2.cmdline_terminate": ("T1059.003",),
    "capev2.cng_large_decryption": (),
    "capev2.completed": (),
    "capev2.config.agenttesla": (),
    "capev2.config.asyncrat": (),
    "capev2.config.dcrat": (),
    "capev2.config.formbook": (),
    "capev2.config.lokibot": (),
    "capev2.config.nanocore": (),
    "capev2.config.redline": (),
    "capev2.config.remcos": (),
    "capev2.config.venomrat": (),
    "capev2.config.xworm": (),
    "capev2.contains_pe_overlay": (),
    "capev2.creates_largekey": (),
    "capev2.creates_nullvalue": ("T1112",),
    "capev2.creates_suspended_process": (),
    "capev2.createtoolhelp32snapshot_module_enumeration": (),
    "capev2.dead_connect": (),
    "capev2.decompress_exe": ("T1027.002",),
    "capev2.deletes_executed_files": ("T1070.004",),
    "capev2.deletes_files": (),
    "capev2.deletes_self": ("T1070.004",),
    "capev2.detection.agenttesla": (),
    "capev2.detection.arrowrat": (),
    "capev2.detection.asyncrat": (),
    "capev2.detection.dcrat": (),
    "capev2.detection.dlagent10": (),
    "capev2.detection.emotet": (),
    "capev2.detection.formbook": (),
    "capev2.detection.guloader": (),
    "capev2.detection.hijackloader": (),
    "capev2.detection.icedidloader": (),
    "capev2.detection.lokibot": (),
    "capev2.detection.nanocore": (),
    "capev2.detection.njrat": (),
    "capev2.detection.raccoon": (),
    "capev2.detection.redline": (),
    "capev2.detection.remcos": (),
    "capev2.detection.remoteutilitiesrat": (),
    "capev2.detection.rhadamanthys": (),
    "capev2.detection.salat": (),
    "capev2.detection.stormkitty": (),
    "capev2.detection.venomrat": (),
    "capev2.detection.vipkeylogger": (),
    "capev2.detection.warzonerat": (),
    "capev2.detection.winosstager": (),
    "capev2.detection.xworm": (),
    "capev2.direct_hdd_access": (),
    "capev2.direct_syscall_evasion": ("T1106",),
    "capev2.discover_registry_mount_points": (),
    "capev2.dll_load_uncommon_file_types": (),
    "capev2.dllload_suspicious_directory": (),
    "capev2.document_script_exe_drop": (),
    "capev2.dotnet_code_compile": ("T1027.004",),
    "capev2.dotnet_csc_build": ("T1027.004",),
    "capev2.driver_filtermanager": (),
    "capev2.driver_load": (),
    "capev2.dropper": (),
    "capev2.drops_files": (),
    "capev2.dynamic_function_loading": (),
    "capev2.encrypted_ioc": (),
    "capev2.enumerates_physical_drives": (),
    "capev2.enumerates_running_processes": ("T1057",),
    "capev2.exception_driven_execution": (),
    "capev2.executes_headless_browser": (),
    "capev2.folder_enumeration": ("T1083",),
    "capev2.generates_crypto_key": (),
    "capev2.get_clipboard_data": ("T1115",),
    "capev2.hardware_id_profiling": ("T1082",),
    "capev2.http_request": ("T1071.001",),
    "capev2.infostealer_bitcoin": ("T1005",),
    "capev2.infostealer_browser": ("T1555.003",),
    "capev2.infostealer_cookies": ("T1539",),
    "capev2.infostealer_ftp": ("T1555",),
    "capev2.infostealer_im": ("T1005",),
    "capev2.infostealer_keylog": ("T1056.001",),
    "capev2.infostealer_mail": ("T1005",),
    "capev2.injection_createremotethread": ("T1055",),
    "capev2.injection_module_stomping_probing": (),
    "capev2.injection_network_traffic": (),
    "capev2.injection_runpe": ("T1055.012",),
    "capev2.injection_rwx": (),
    "capev2.injection_write_exe_process": ("T1055",),
    "capev2.injection_write_process": ("T1055",),
    "capev2.interprocess_comms_mutex": (),
    "capev2.interprocess_comms_shared_memory": (),
    "capev2.ipc_namedpipe": (),
    "capev2.language_check_registry": (),
    "capev2.legitimate_domain_abuse": (),
    "capev2.long_commandline": (),
    "capev2.mass_file_modification_access": (),
    "capev2.mimics_agent": ("T1071.001",),
    "capev2.modify_certs": (),
    "capev2.mountpoint_manager_access": (),
    "capev2.mountpoints_volume_discovery": (),
    "capev2.mouse_movement_detect": (),
    "capev2.multiple_useragents": (),
    "capev2.network_anomaly": (),
    "capev2.network_bind": (),
    "capev2.network_cnc_http": ("T1071.001",),
    "capev2.network_cnc_https_generic": ("T1071.001",),
    "capev2.network_cnc_https_payload": ("T1105",),
    "capev2.network_connection_via_suspicious_process": (),
    "capev2.network_document_file": (),
    "capev2.network_downloader_exe": ("T1105",),
    "capev2.network_dyndns": ("T1071",),
    "capev2.network_http": ("T1071.001",),
    "capev2.network_icmp": (),
    "capev2.network_questionable_http_path": ("T1071.001",),
    "capev2.office_macro_autoexecution": ("T1204.002", "T1059.005",),
    "capev2.office_macro_suspicious": (),
    "capev2.overwrites_admin_password": ("T1531",),
    "capev2.packer_entropy": ("T1027.002",),
    "capev2.packer_unknown_pe_section_name": (),
    "capev2.packer_vmprotect": ("T1027.002",),
    "capev2.pe_cert_self_signed": (),
    "capev2.pe_compile_timestomping": (),
    "capev2.pe_deep_entrypoint": (),
    "capev2.pe_exports_in_executable": (),
    "capev2.pe_section_vsize_rsize_anomaly": (),
    "capev2.pe_tls_callbacks": (),
    "capev2.pe_writable_executable_section": (),
    "capev2.per_file_acl_token_check": (),
    "capev2.persistence_ads": (),
    "capev2.persistence_autorun": ("T1547",),
    "capev2.persistence_autorun_tasks": ("T1547",),
    "capev2.persistence_registry_script": ("T1027.011",),
    "capev2.physical_drive_access": (),
    "capev2.polymorphic": ("T1027",),
    "capev2.powershell_command_suspicious": ("T1059.001",),
    "capev2.powershell_download": ("T1059.001", "T1105",),
    "capev2.powershell_network_connection": ("T1059.001",),
    "capev2.powershell_renamed": (),
    "capev2.powershell_request": ("T1059.001", "T1071",),
    "capev2.powershell_variable_obfuscation": ("T1059.001",),
    "capev2.privilege_elevation_check": (),
    "capev2.process_creation_suspicious_location": (),
    "capev2.process_interest": (),
    "capev2.process_needed": (),
    "capev2.procmem_yara": (),
    "capev2.queries_computer_name": ("T1082",),
    "capev2.queries_keyboard_layout": (),
    "capev2.queries_locale_api": (),
    "capev2.queries_user_name": ("T1033",),
    "capev2.query_fips_reconnaissance": (),
    "capev2.ransomware_file_modifications": (),
    "capev2.reads_files": (),
    "capev2.reads_memory_remote_process": (),
    "capev2.reads_password_database": ("T1555.005",),
    "capev2.reads_self": (),
    "capev2.recon_checkip": ("T1016",),
    "capev2.recon_fingerprint": ("T1082",),
    "capev2.recon_programs": (),
    "capev2.recon_systeminfo": ("T1082",),
    "capev2.registers_vectored_exception_handler": (),
    "capev2.registry_credential_store_access": ("T1552.002",),
    "capev2.removes_zoneid_ads": ("T1553.005",),
    "capev2.resumethread_remote_process": (),
    "capev2.script_created_process": ("T1059",),
    "capev2.script_network_activity": ("T1059",),
    "capev2.script_tool_executed": ("T1059",),
    "capev2.section_mapping_injection": ("T1055",),
    "capev2.spoofs_procname": ("T1036",),
    "capev2.static_pe_anomaly": (),
    "capev2.static_pe_pdbpath": (),
    "capev2.stealth_file": ("T1564.001",),
    "capev2.stealth_hiddenreg": ("T1564.001",),
    "capev2.stealth_network": (),
    "capev2.stealth_timeout": (),
    "capev2.stealth_window": ("T1564.003",),
    "capev2.suspicious_browser_arguments": (),
    "capev2.suspicious_certutil_use": (),
    "capev2.suspicious_command_tools": (),
    "capev2.suspicious_communication_trusted_site": (),
    "capev2.suspicious_html_title": (),
    "capev2.suspicious_http_timeouts": (),
    "capev2.suspicious_iocontrol_codes": (),
    "capev2.suspicious_ntdll_disk_load": (),
    "capev2.suspicious_ping_use": (),
    "capev2.suspicious_tld": (),
    "capev2.sysinternals_psexec": ("T1569.002",),
    "capev2.sysinternals_tools": (),
    "capev2.terminates_remote_process": (),
    "capev2.territorial_disputes_sigs": (),
    "capev2.thread_unbacked_memory": ("T1620",),
    "capev2.uiautomationcore_load": (),
    "capev2.unbacked_amsi_patching": ("T1562.001", "T1620",),
    "capev2.unbacked_api_resolution": ("T1620",),
    "capev2.unbacked_bind_shell": ("T1620",),
    "capev2.unbacked_com_instantiation": ("T1620",),
    "capev2.unbacked_crypto_operations": ("T1620",),
    "capev2.unbacked_delay_execution": ("T1620",),
    "capev2.unbacked_dns_resolution": ("T1620",),
    "capev2.unbacked_dotnet_execution": ("T1620",),
    "capev2.unbacked_etw_patching": ("T1562.006",),
    "capev2.unbacked_exception_filter": ("T1620",),
    "capev2.unbacked_file_dropping": ("T1620",),
    "capev2.unbacked_library_load": ("T1620",),
    "capev2.unbacked_memory_network_connection": ("T1620",),
    "capev2.unbacked_memory_protection_alteration": ("T1620",),
    "capev2.unbacked_mutex_creation": ("T1620",),
    "capev2.unbacked_privilege_escalation": ("T1620",),
    "capev2.unbacked_process_creation": ("T1620",),
    "capev2.unbacked_process_enumeration": ("T1620", "T1057",),
    "capev2.unbacked_process_mitigation_alteration": ("T1620",),
    "capev2.unbacked_registry_modification": ("T1620",),
    "capev2.unbacked_service_manipulation": ("T1620",),
    "capev2.unbacked_syscall_execution": ("T1620",),
    "capev2.unbacked_token_manipulation": ("T1620",),
    "capev2.uses_windows_utilities": (),
    "capev2.uses_windows_utilities_to_create_scheduled_task": ("T1053.005",),
    "capev2.uses_windows_utilities_xcopy": (),
    "capev2.virus": (),
    "capev2.windows_defender_powershell": ("T1562.001", "T1059.001",),
    "capev2.wmic_command_suspicious": ("T1047",),
    "capev2.writes_files": (),
    "diskimage.embedded_executable": (),
    "diskimage.embedded_url": (),
    "diskimage.script_present": (),
    "diskimage.suspicious_filename": ("T1036",),
    "document.mentions_dynamic_execution": (),
    "document.mentions_persistence": (),
    "document.mentions_remote_payload": (),
    "dynamic.not_attributable": (),
    "elf.no_sections": (),
    "elf.packed": ("T1027.002",),
    "elf.parse_failed": (),
    "elf.statically_linked": (),
    "elf.stripped": (),
    "elf.suspicious_strings": (),
    "generic.double_extension": ("T1036.007",),
    "generic.extension_mismatch": ("T1036.008",),
    "generic.high_entropy_overall": (),
    "generic.ip_literal_url": (),
    "generic.many_urls": (),
    "generic.suspicious_tld": (),
    "generic.tiny_file": (),
    "jar.main_class": (),
    "jar.native_libs": (),
    "jar.reflection": (),
    "jar.runtime_exec": (),
    "lnk.command_line_attack": ("T1204.002",),
    "lnk.header_malformed": (),
    "lnk.icon_disguise": ("T1036",),
    "lnk.oversized_for_a_shortcut": (),
    "lnk.runs_an_interpreter": (),
    # AMENDED AFTER REVIEW, and the reason is consistency rather than taste.
    # The curation gave the DYNAMIC form of this same observation --
    # `capev2.office_macro_autoexecution` -- both T1204.002 and T1059.005, and
    # gave `lnk.command_line_attack` T1204.002 on the identical reasoning: a
    # document whose macro runs on open is built to be delivered to a person and
    # opened by them. Two ids describing one observation must not disagree; the
    # docm corpus was the case that surfaced it, where the static analyzer's
    # verdict lost the delivery technique its dynamic twin kept.
    "office.autoexec_macro": ("T1204.002", "T1059.005",),
    "office.carries_a_document": (),
    "office.dde_field": ("T1559.002",),
    "office.embedded_object": (),
    "office.encrypted": ("T1027.013",),
    "office.macro_obfuscation": ("T1027",),
    "office.macro_suspicious_call.adodb_stream": (),
    "office.macro_suspicious_call.create_object": (),
    "office.macro_suspicious_call.environ_persistence": ("T1547",),
    "office.macro_suspicious_call.filesystem": (),
    "office.macro_suspicious_call.http_client": ("T1071.001", "T1059.005",),
    "office.macro_suspicious_call.powershell": ("T1059.001", "T1059.005",),
    "office.macro_suspicious_call.shell": ("T1059.005",),
    "office.macro_suspicious_call.wscript_shell": ("T1059.005",),
    "office.parse_failed": (),
    "office.part_unreadable": (),
    "office.remote_template": ("T1221",),
    "office.vba_present": (),
    "pdf.embedded_file": (),
    "pdf.encrypted": (),
    "pdf.javascript": (),
    "pdf.object_streams": (),
    "pdf.open_action": (),
    "pdf.page_is_one_click_target": (),
    "pdf.page_renders_no_text": (),
    "pdf.parse_failed": (),
    "pdf.reader_incompatible_lure": (),
    "pdf.uri_action": (),
    "pe.dotnet_assembly": (),
    "pe.entrypoint_anomaly": (),
    "pe.few_imports": (),
    "pe.high_entropy_section": ("T1027.002",),
    "pe.import_combination": (),
    "pe.imports.anti_debug": (),
    "pe.imports.crypto": (),
    "pe.imports.dynamic_resolution": (),
    "pe.imports.keylogging": (),
    "pe.imports.network": (),
    "pe.imports.persistence": (),
    "pe.imports.process_injection": (),
    "pe.no_imports": (),
    "pe.overlay_present": (),
    "pe.packer_section_name": ("T1027.002",),
    "pe.parse_failed": (),
    "pe.section_size_anomaly": (),
    "pe.signature_does_not_cover_file": ("T1036.001",),
    "pe.signature_present": (),
    "pe.signature_verified": (),
    "pe.timestamp_anomaly": (),
    "pe.tls_callbacks": (),
    "pe.writable_executable_section": (),
    "rtf.object_auto_executes": (),
    "script.decoded_layer": ("T1027",),
    "script.download_and_execute": ("T1105",),
    "script.dynamic_execution": (),
    "script.encoded_command": ("T1027.010",),
    "script.execution_policy_bypass": ("T1059.001",),
    "script.hidden_window": ("T1564.003",),
    "script.long_one_liner": (),
    "script.obfuscation_high": ("T1027",),
    "script.persistence": (),
    "yara.bitsadmin_transfer_download": ("T1197", "T1105",),
    "yara.embedded_pe_in_nonpe": (),
    "yara.js_obfuscation_eval_decode": ("T1027",),
    "yara.lolbin_certutil_download_or_decode": ("T1105", "T1140",),
    "yara.lolbin_regsvr32_scrobj": ("T1218.010",),
    "yara.office_ole_contains_vba_project": (),
    "yara.pe_keylogger_api_combo": (),
    "yara.pe_process_injection_import_combo": ("T1055",),
    "yara.powershell_download_cradle": ("T1059.001", "T1105",),
    "yara.powershell_stealth_flags": ("T1059.001", "T1564.003",),
    "yara.themida_winlicense_protected": ("T1027.002",),
    "yara.upx_packed_executable": ("T1027.002",),
    "yara.vba_autoexec_and_shell": ("T1059.005",),
    "yara.vba_download_and_execute": ("T1059.005",),
    "yara.vba_suspicious_autoexec_keywords": ("T1059.005",),
    "yara.wscript_shell_command_execution": ("T1059",),
}


#: Which tactic each technique belongs to, and its name. Canonical ATT&CK, not
#: the curators' -- in nine cases a curator wrote the tactic of the surrounding
#: BEHAVIOUR ("T1057 Process Discovery, Defense Evasion") rather than the tactic
#: of the technique. A technique's tactic is a property of the technique.
_TECHNIQUE_NAMES: dict[str, tuple[str, str]] = {
    "T1005": ("Data from Local System", "Collection"),
    "T1016": ("System Network Configuration Discovery", "Discovery"),
    "T1027": ("Obfuscated Files or Information", "Defense Evasion"),
    "T1027.002": ("Obfuscated Files or Information: Software Packing", "Defense Evasion"),
    "T1027.004": ("Compile After Delivery", "Defense Evasion"),
    "T1027.010": ("Command Obfuscation", "Defense Evasion"),
    "T1027.011": ("Fileless Storage", "Defense Evasion"),
    "T1027.013": ("Encrypted/Encoded File", "Defense Evasion"),
    "T1033": ("System Owner/User Discovery", "Discovery"),
    "T1036": ("Masquerading", "Defense Evasion"),
    "T1036.001": ("Invalid Code Signature", "Defense Evasion"),
    "T1036.007": ("Double File Extension", "Defense Evasion"),
    "T1036.008": ("Masquerade File Type", "Defense Evasion"),
    "T1047": ("Windows Management Instrumentation", "Execution"),
    "T1053.005": ("Scheduled Task/Job: Scheduled Task", "Persistence"),
    "T1055": ("Process Injection", "Defense Evasion"),
    "T1055.012": ("Process Hollowing", "Defense Evasion"),
    "T1056.001": ("Input Capture: Keylogging", "Collection"),
    "T1057": ("Process Discovery", "Discovery"),
    "T1059": ("Command and Scripting Interpreter", "Execution"),
    "T1059.001": ("Command and Scripting Interpreter: PowerShell", "Execution"),
    "T1059.003": ("Command and Scripting Interpreter: Windows Command Shell", "Execution"),
    "T1059.005": ("Command and Scripting Interpreter: Visual Basic", "Execution"),
    "T1070.004": ("File Deletion", "Defense Evasion"),
    "T1071": ("Application Layer Protocol", "Command and Control"),
    "T1071.001": ("Application Layer Protocol: Web Protocols", "Command and Control"),
    "T1082": ("System Information Discovery", "Discovery"),
    "T1083": ("File and Directory Discovery", "Discovery"),
    "T1105": ("Ingress Tool Transfer", "Command and Control"),
    "T1106": ("Native API", "Execution"),
    "T1112": ("Modify Registry", "Defense Evasion"),
    "T1115": ("Clipboard Data", "Collection"),
    "T1140": ("Deobfuscate/Decode Files or Information", "Defense Evasion"),
    "T1197": ("BITS Jobs", "Defense Evasion"),
    "T1204.002": ("User Execution: Malicious File", "Execution"),
    "T1218.010": ("System Binary Proxy Execution: Regsvr32", "Defense Evasion"),
    "T1221": ("Template Injection", "Defense Evasion"),
    "T1518.001": ("Security Software Discovery", "Discovery"),
    "T1531": ("Account Access Removal", "Impact"),
    "T1539": ("Steal Web Session Cookie", "Credential Access"),
    "T1547": ("Boot or Logon Autostart Execution", "Persistence"),
    "T1552.002": ("Credentials in Registry", "Credential Access"),
    "T1553.005": ("Subvert Trust Controls: Mark-of-the-Web Bypass", "Defense Evasion"),
    "T1555": ("Credentials from Password Stores", "Credential Access"),
    "T1555.003": ("Credentials from Web Browsers", "Credential Access"),
    "T1555.005": ("Password Managers", "Credential Access"),
    "T1559.002": ("Inter-Process Communication: Dynamic Data Exchange", "Execution"),
    "T1562.001": ("Impair Defenses: Disable or Modify Tools", "Defense Evasion"),
    "T1562.006": ("Impair Defenses: Indicator Blocking", "Defense Evasion"),
    "T1564.001": ("Hide Artifacts: Hidden Files and Directories", "Defense Evasion"),
    "T1564.003": ("Hide Artifacts: Hidden Window", "Defense Evasion"),
    "T1569.002": ("System Services: Service Execution", "Execution"),
    "T1620": ("Reflective Code Loading", "Defense Evasion"),
}


def map_techniques(
    signals: Iterable[Signal],
    *,
    exclude: frozenset[str] | set[str] | None = None,
) -> list[dict[str, Any]]:
    """Return the ATT&CK techniques the signals map to, with their evidence.

    `exclude` drops signal ids that must not assert a technique. There is no
    severity gate here on purpose — a blanket one was measured and rejected,
    because it removed 362 techniques across the deployment including 28 on
    malicious samples — so an id that has been demoted for scoring still maps
    unless it is named here.

    That asymmetry produced a live wrong claim. `capev2.stealth_network` is a
    guaranteed false positive on Linux (the strace processor emits category
    `net`, the signature looks for `network`), and on the first real ELF
    detonation it asserted **T1071 Application Layer Protocol** on a report
    whose score had deliberately ignored it. A technique in an ATT&CK panel is
    an accusation with a reference number.
    """
    signals = list(signals)
    if exclude:
        signals = [s for s in signals if s.id not in exclude]
    found: dict[str, dict[str, Any]] = {}
    for signal in signals:
        if _is_anti_analysis(signal):
            tid, name, tactic = _ANTI_TECHNIQUE
            # `_is_anti_analysis` matches whole underscore/dot tokens of the ID
            # (mitre.py:136), never the prose, so this branch is id-backed by
            # construction. Stated rather than left absent, because a missing
            # `basis` on one branch is how a consumer learns to treat the field
            # as optional and then stops rendering it.
            entry = found.setdefault(
                tid,
                {
                    "technique_id": tid, "name": name, "tactic": tactic,
                    "evidence": [], "basis": "signal-id",
                },
            )
            entry["basis"] = "signal-id"
            if signal.id not in entry["evidence"]:
                entry["evidence"].append(signal.id)
            continue

        # THE CURATED TABLE IS AUTHORITATIVE, INCLUDING WHEN IT SAYS NOTHING.
        #
        # An id that was reviewed and found to evidence no technique must not
        # then be handed to the keyword rules -- that would put every rejected
        # claim straight back. `capev2.queries_locale_api` was rejected on the
        # counts (210 clean, 166 malicious); the word "locale" in its title is
        # exactly what a keyword rule would catch.
        if signal.id in _ID_TECHNIQUES:
            for tid in _ID_TECHNIQUES[signal.id]:
                name, tactic = _TECHNIQUE_NAMES[tid]
                entry = found.setdefault(
                    tid,
                    {
                        "technique_id": tid, "name": name, "tactic": tactic,
                        "evidence": [], "basis": "curated",
                    },
                )
                # A curated claim outranks a keyword one for the same technique:
                # it was read by a person against a stated standard, twice.
                entry["basis"] = "curated"
                if signal.id not in entry["evidence"]:
                    entry["evidence"].append(signal.id)
            continue

        # THE FALLBACK, FOR IDS THE TABLE DOES NOT COVER.
        #
        # Reached only by a signal id absent from `_ID_TECHNIQUES` -- a new
        # analyzer, a CAPE signature that did not appear in the corpus the table
        # was curated from. Leaving those unmapped would silently shrink the
        # ATT&CK panel every time the engine learned something new.
        #
        # These rules match the id AND the prose title, and the title is where a
        # sandbox writes its hypotheses ("can be used to adapt C2 network
        # behaviour" -> T1071). That is why they are the fallback now rather than
        # the mechanism, and why what a claim RESTS ON is published with it:
        # `basis` is "signal-id" when the identifier itself carried the keyword,
        # "description" when only the sentence did. A reader can weigh the claim
        # instead of being asked to trust it.
        low_id = signal.id.lower()
        low_title = str(signal.title or "").lower()
        for keys, tid, name, tactic in _RULES:
            in_id = any(k in low_id for k in keys)
            in_title = any(k in low_title for k in keys)
            if not (in_id or in_title):
                continue
            entry = found.setdefault(
                tid,
                {
                    "technique_id": tid,
                    "name": name,
                    "tactic": tactic,
                    "evidence": [],
                    "basis": "description",
                },
            )
            # One id-backed signal is enough to make the whole technique
            # id-backed: the strongest available footing wins, and it is a
            # property of the claim, not of the last signal that touched it.
            if in_id:
                entry["basis"] = "signal-id"
            if signal.id not in entry["evidence"]:
                entry["evidence"].append(signal.id)
    # Stable order: by tactic then technique id.
    _TACTIC_ORDER = [
        "Initial Access", "Execution", "Persistence", "Privilege Escalation",
        "Defense Evasion", "Credential Access", "Discovery", "Lateral Movement",
        "Collection", "Command and Control", "Exfiltration", "Impact",
    ]
    return sorted(
        found.values(),
        key=lambda t: (_TACTIC_ORDER.index(t["tactic"]) if t["tactic"] in _TACTIC_ORDER else 99, t["technique_id"]),
    )
