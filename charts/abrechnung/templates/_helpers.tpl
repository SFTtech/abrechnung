{{/*
Expand the name of the chart.
*/}}
{{- define "abrechnung.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "abrechnung.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "abrechnung.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "abrechnung.labels" -}}
helm.sh/chart: {{ include "abrechnung.chart" . }}
{{ include "abrechnung.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "abrechnung.selectorLabels" -}}
app.kubernetes.io/name: {{ include "abrechnung.name" . }}-frontend
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "abrechnung.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "abrechnung.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}


{{/* Generate env */}}
{{- define "abrechnung.env" -}}
- name: SERVICE_URL
  value: {{ .Values.abrechnung.url }}
- name: SERVICE_API_URL
  value: "{{ .Values.abrechnung.url }}/api"
- name: SERVICE_NAME
  value: {{ .Values.abrechnung.name }}
- name: DB_HOST
  value: {{ .Values.postgresql.host }}
- name: DB_USER
  value: {{ .Values.postgresql.user }}
- name: DB_NAME
  value: {{ .Values.postgresql.name }}
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ .Values.postgresql.existingSecretName }}
      key: {{ .Values.postgresql.existingSecretKey }}
- name: ABRECHNUNG_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ .Values.abrechnung.pythonSecret.existingSecretName }}
      key: {{ .Values.abrechnung.pythonSecret.existingSecretKey }}
- name: ABRECHNUNG_PORT
  value: "{{ .Values.abrechnung.port }}"
- name: ABRECHNUNG_ID
  value: {{ .Values.abrechnung.id }}
- name: REGISTRATION_ENABLED
  value: "{{ .Values.abrechnung.registration.enabled }}"
- name: REGISTRATION_VALID_EMAIL_DOMAINS
  value: {{ .Values.abrechnung.registration.validEmailDomains }}
- name: REGISTRATION_ALLOW_GUEST_USERS
  value: "{{ .Values.abrechnung.registration.allowGuestUsers }}"
- name: ABRECHNUNG_EMAIL
  value: {{ .Values.abrechnung.email.address }}
- name: SMTP_HOST
  value: {{ .Values.abrechnung.email.host }}
- name: SMTP_PORT
  value: "{{ .Values.abrechnung.email.port }}"
- name: SMTP_MODE
  value: {{ .Values.abrechnung.email.mode }}
- name: SMTP_USER
  value: {{ .Values.abrechnung.email.username }}
- name: SMTP_PASSWORD
  value: "replaceme"
  value: {{ .Values.abrechnung.email.password }}
- name: POSTGRES_USER
  value: {{ .Values.postgresql.user }}
- name: POSTGRES_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ .Values.postgresql.existingSecretName }}
      key: {{ .Values.postgresql.existingSecretKey }}
- name: POSTGRES_DATABASE
  value: {{ .Values.postgresql.name }}
{{- end }}
