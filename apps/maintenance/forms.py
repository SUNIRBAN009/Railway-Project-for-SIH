from django import forms
from .models import DefectReport, WorkOrder, DefectType, DefectSeverity, DefectStatus

class DefectReportForm(forms.ModelForm):
    class Meta:
        model = DefectReport
        fields = [
            'defect_type', 'severity', 'section_name', 'track_km_marker',
            'latitude', 'longitude', 'train_number', 'coach_number',
            'description', 'photo'
        ]
        widgets = {
            'defect_type': forms.Select(attrs={'class': 'form-select'}),
            'severity': forms.Select(attrs={'class': 'form-select'}),
            'section_name': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'e.g. Asansol - Dhanbad Line 2'}),
            'track_km_marker': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'e.g. KM 220/14'}),
            'latitude': forms.NumberInput(attrs={'class': 'form-input', 'step': 'any'}),
            'longitude': forms.NumberInput(attrs={'class': 'form-input', 'step': 'any'}),
            'train_number': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Optional if track-based'}),
            'coach_number': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Optional'}),
            'description': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 3, 'placeholder': 'Provide visual defect indicators or sensor telemetry readings...'}),
            'photo': forms.FileInput(attrs={'class': 'form-file-input'}),
        }

class WorkOrderCreateForm(forms.ModelForm):
    class Meta:
        model = WorkOrder
        fields = ['assigned_crew', 'assigned_engineer', 'target_completion_time', 'repair_summary', 'status']
        widgets = {
            'assigned_crew': forms.TextInput(attrs={'class': 'form-input'}),
            'assigned_engineer': forms.Select(attrs={'class': 'form-select'}),
            'target_completion_time': forms.DateTimeInput(attrs={'class': 'form-input', 'type': 'datetime-local'}),
            'repair_summary': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 3}),
            'status': forms.Select(attrs={'class': 'form-select'}),
        }
