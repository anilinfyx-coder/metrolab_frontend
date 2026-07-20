const fs = require('fs');
const file = 'src/app/admin/dashboard/physical-examinations/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /const handleSubmit = async \([\s\S]*?const deleteCert = async/;
const replacement = \`const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(\\\`\${API}/api/PhysicalExaminationCertificates\\\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.response_code === '200') {
        alert('Certificate issued successfully');
        setShowModal(false);
        fetchData();
        setFormData({
          patient_id: '', age: '', height: '', weight: '', bp: '', pulse: '',
          hearing_right: '', hearing_left: '', vision_right: '', vision_left: '', wear_glasses: false,
          eval_head: '', eval_nose: '', eval_mouth: '', eval_ears: '',
          eval_eyes: '', eval_lungs: '', eval_heart: '', eval_vascular: '',
          eval_abdomen: '', eval_spine: '', eval_skin: '', eval_neurologic: '',
          additional_comments: '', overall_condition: 'Fit', clinician_name: '', clinician_specialty: '',
          date_of_examination: '', clinician_address: ''
        });
      } else {
        alert(data.obj);
      }
    } catch (err) {
      alert('Failed to save');
    }
  };

  const deleteCert = async\`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
