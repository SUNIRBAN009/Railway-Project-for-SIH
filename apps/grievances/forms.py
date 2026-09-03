from django import forms
from .models import Grievance, GrievanceComment, GrievanceCategory, GrievancePriority, GrievanceStatus

class GrievanceLodgeForm(forms.ModelForm):
    class Meta:
        model = Grievance
        fields = [
            'passenger_name', 'passenger_phone', 'pnr_number',
            'train_number', 'coach_number', 'seat_number', 'current_station',
            'category', 'subject', 'description', 'attachment'
        ]
        widgets = {
            'passenger_name': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Full name of passenger'}),
            'passenger_phone': forms.TextInput(attrs={'class': 'form-input', 'placeholder': '10-digit mobile number'}),
            'pnr_number': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'e.g. 2458917302 (Optional)'}),
            'train_number': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'e.g. 12004 or Train Name'}),
            'coach_number': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'e.g. B2, S5, C1'}),
            'seat_number': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'e.g. 34, 45'}),
            'current_station': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'e.g. Approaching Kanpur / NDLS'}),
            'category': forms.Select(attrs={'class': 'form-select', 'id': 'grievance_category'}),
            'subject': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Short summary of the issue'}),
            'description': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 4, 'placeholder': 'Describe the incident in detail. Our AI will analyze urgency & route to appropriate railway staff immediately.', 'id': 'grievance_description'}),
            'attachment': forms.FileInput(attrs={'class': 'form-file-input', 'accept': 'image/*'}),
        }

class GrievanceStatusUpdateForm(forms.ModelForm):
    remarks = forms.CharField(required=False, widget=forms.Textarea(attrs={'class': 'form-textarea', 'rows': 3, 'placeholder': 'Resolution notes or action taken...'}))

    class Meta:
        model = Grievance
        fields = ['status', 'priority', 'assigned_department', 'assigned_to', 'resolution_notes']
        widgets = {
            'status': forms.Select(attrs={'class': 'form-select'}),
            'priority': forms.Select(attrs={'class': 'form-select'}),
            'assigned_department': forms.TextInput(attrs={'class': 'form-input'}),
            'assigned_to': forms.Select(attrs={'class': 'form-select'}),
            'resolution_notes': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 3}),
        }

class GrievanceCommentForm(forms.ModelForm):
    class Meta:
        model = GrievanceComment
        fields = ['message']
        widgets = {
            'message': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 2, 'placeholder': 'Add a response or update note...'}),
        }
