const fetch = require('node-fetch');

const sendFeaturesToAI = async (features) => {
    // Convert features array to request object format
    const requestData = {
        email: features[0],  // email_length
        password: features[1],  // password_length
        method: 'POST',
        endpoint: '/api/login',
        user_agent: features[5],  // user_agent_length
        ip: `${features[6]}.${features[7]}.${features[8]}.${features[9]}`,  // ip octets
        time_since_last: features[10],
        body: {
            email: features[0],  // email_length
            password: features[1]  // password_length
        },
        // Add all features for the detector to use
        features: {
            email_length: features[0],
            password_length: features[1],
            password_special_chars: features[2],
            is_post: features[3],
            is_login_endpoint: features[4],
            user_agent_length: features[5],
            ip_octet_1: features[6],
            ip_octet_2: features[7],
            ip_octet_3: features[8],
            ip_octet_4: features[9],
            time_since_last: features[10],
            body_field_count: features[11],
            has_sql: features[12],
            has_script: features[13],
            hour: features[14],
            day: features[15],
            is_gmail: features[16],
            is_yahoo: features[17],
            is_outlook: features[18],
            dummy: features[19]
        }
    };

    const response = await fetch('http://127.0.0.1:5002/predict', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
    });

    const result = await response.json();
    return result;
};

module.exports = { sendFeaturesToAI };
  