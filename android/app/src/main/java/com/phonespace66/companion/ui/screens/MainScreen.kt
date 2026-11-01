package com.phonespace66.companion.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.phonespace66.companion.PhoneSpaceApp
import com.phonespace66.companion.networking.NetworkUtils
import com.phonespace66.companion.ui.components.PairingDialog
import com.phonespace66.companion.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(app: PhoneSpaceApp) {
    val pendingPairing by app.pairingManager.pendingPairing.collectAsState()
    val isConnected by app.webSocketServer.isConnected.collectAsState()
    val connectedDesktop by app.webSocketServer.connectedDesktopName.collectAsState()

    var telemetry by remember { mutableStateOf(app.telemetryManager.getFullTelemetry()) }
    val ipAddress = remember { NetworkUtils.getLocalIpAddress() }

    // Dialog for active pairing request
    pendingPairing?.let { request ->
        PairingDialog(
            request = request,
            onApprove = { app.pairingManager.approvePairing() },
            onReject = { app.pairingManager.rejectPairing() }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(9.dp)
                                .clip(CircleShape)
                                .background(if (isConnected) Platinum else Graphite)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "PHONE SPACE66",
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp,
                            fontSize = 18.sp,
                            color = Platinum
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Charcoal950,
                    titleContentColor = TextPrimary
                ),
                actions = {
                    IconButton(onClick = { telemetry = app.telemetryManager.getFullTelemetry() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = TextSecondary)
                    }
                }
            )
        },
        containerColor = Charcoal950
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Connection Status Banner
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Charcoal900),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderSubtle, RoundedCornerShape(16.dp))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "LAN SERVER STATUS",
                            style = MaterialTheme.typography.labelLarge,
                            color = SilverAccent,
                            letterSpacing = 1.5.sp
                        )
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Charcoal800,
                            border = androidx.compose.foundation.BorderStroke(1.dp, BorderSubtle)
                        ) {
                            Text(
                                text = if (isConnected) "CONNECTED" else "BROADCASTING",
                                color = if (isConnected) Platinum else TextSecondary,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    StatusItem(
                        icon = Icons.Default.Wifi,
                        title = "Local IP Address",
                        value = "$ipAddress:6655"
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    StatusItem(
                        icon = Icons.Default.SettingsRemote,
                        title = "mDNS Discovery",
                        value = "_phonespace66._tcp (Active)"
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    StatusItem(
                        icon = Icons.Default.Computer,
                        title = "Connected Laptop",
                        value = connectedDesktop ?: "Waiting for desktop..."
                    )
                }
            }

            // Real Phone Telemetry Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Charcoal900),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderSubtle, RoundedCornerShape(16.dp))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "DEVICE TELEMETRY",
                        style = MaterialTheme.typography.labelLarge,
                        color = SilverAccent,
                        letterSpacing = 1.5.sp
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    StatusItem(
                        icon = Icons.Default.PhoneAndroid,
                        title = "Phone Model",
                        value = "${telemetry.device.manufacturer} ${telemetry.device.model} (Android ${telemetry.device.androidVersion})"
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    val battery = telemetry.battery
                    StatusItem(
                        icon = if (battery.isCharging) Icons.Default.BatteryChargingFull else Icons.Default.BatteryFull,
                        title = "Battery",
                        value = "${battery.level}% • ${if (battery.isCharging) "Charging (${battery.chargingSource})" else "Discharging"} • ${battery.temperatureCelsius}°C"
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    val storage = telemetry.storage
                    val usedGb = "%.1f".format(storage.usedBytes / 1_000_000_000.0)
                    val totalGb = "%.1f".format(storage.totalBytes / 1_000_000_000.0)
                    StatusItem(
                        icon = Icons.Default.Storage,
                        title = "Internal Storage",
                        value = "$usedGb GB / $totalGb GB used"
                    )
                }
            }

            // Pairing & Security Actions
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Charcoal900),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderSubtle, RoundedCornerShape(16.dp))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "SECURITY CONTROLS",
                        style = MaterialTheme.typography.labelLarge,
                        color = SilverAccent,
                        letterSpacing = 1.5.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Sessions are securely encrypted. Only approve pairing requests initiated by your own laptop.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedButton(
                        onClick = { app.pairingManager.revokeAll() },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = TextSecondary),
                        border = androidx.compose.foundation.BorderStroke(1.dp, BorderSubtle),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Revoke Paired Devices")
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusItem(icon: ImageVector, title: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Charcoal800)
                .border(1.dp, BorderSubtle, RoundedCornerShape(8.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = SilverAccent, modifier = Modifier.size(18.dp))
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(text = title, style = MaterialTheme.typography.bodyMedium, color = TextMuted)
            Text(text = value, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, color = TextPrimary)
        }
    }
}
