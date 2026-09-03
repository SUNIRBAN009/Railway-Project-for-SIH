from django import forms
from .models import SOSAlert, EmergencyType, SOSStatus

class SOSTriggerForm(forms.ModelForm):
    latitude = forms.FloatField(required=False, widget=forms.HiddenInput(), initial=28.6139)
    longitude = forms.FloatField(required=False, widget=forms.HiddenInput(), initial=77.2090)

    class Meta:
        model = SOSAlert
        fields = [
            'passenger_name', 'passenger_phone', 'emergency_type',
            'train_number', 'coach_number', 'seat_number',
            'current_location_desc', 'latitude', 'longitude', 'details'
        ]
        widgets = {
            'passenger_name': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Your Name'}),
            'passenger_phone': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Active Phone Number'}),
            'emergency_type': forms.Select(attrs={'class': 'form-select', 'id': 'sos_type_select'}),
            'train_number': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'e.g. 12301 / Rajdhani'}),
            'coach_number': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'e.g. B4'}),
            'seat_number': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'e.g. 23'}),
            'current_location_desc': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Current station or route milestone'}),
            'details': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 2, 'placeholder': 'Briefly describe the threat (e.g. weapon, severe bleeding, smoke)'}),
        }

    def clean_latitude(self):
        lat = self.cleaned_data.get('latitude')
        return lat if lat is not None else 28.6139

    def clean_longitude(self):
        lng = self.cleaned_data.get('longitude')
        return lng if lng is not None else 77.2090

class SOSResponseForm(forms.ModelForm):
    class Meta:
        model = SOSAlert
        fields = ['status', 'rpf_unit_dispatched', 'response_notes']
        widgets = {
            'status': forms.Select(attrs={'class': 'form-select'}),
            'rpf_unit_dispatched': forms.TextInput(attrs={'class': 'form-input'}),
            'response_notes': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 3}),
        }
