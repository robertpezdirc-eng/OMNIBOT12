# OMNI AI Platform API

Version: 1.0.0

Comprehensive AI platform for business and personal use

Base URL: `http://localhost:3000`

## Table of Contents

- [Health](#health)
- [AI Core](#ai-core)
- [Memory](#memory)
- [Tourism](#tourism)
- [Hospitality](#hospitality)

## Health

### GET /health

Returns the current health status of all system components

**Responses:**

- **200**: System is healthy

**Examples:**

**Javascript:**

```js
// System Health Check
const response = await fetch('http://localhost:3000/health');
const data = await response.json();
console.log(data);
```

**Python:**

```python
# System Health Check
import requests

response = requests.get('http://localhost:3000/health')
data = response.json()
print(data)
```

**Curl:**

```curl
# System Health Check
curl -X GET "http://localhost:3000/health"
```

**Php:**

```php
<?php
// System Health Check

$response = file_get_contents('http://localhost:3000/health');
$data = json_decode($response, true);
print_r($data);

```

---

## AI Core

### POST /api/ai/chat

Send a message to the AI and receive a response

**Request Body:**

```json
{
  "message": "Hello, how can you help me?",
  "context": {},
  "options": {}
}
```

**Responses:**

- **200**: AI response generated successfully

**Examples:**

**Javascript:**

```js
// AI Chat Completion
const response = await fetch('http://localhost:3000/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
  "message": "Hello, how can you help me?",
  "context": {},
  "options": {}
})
});
const data = await response.json();
console.log(data);
```

**Python:**

```python
# AI Chat Completion
import requests

data = {
  "message": "Hello, how can you help me?",
  "context": {},
  "options": {}
}
response = requests.post('http://localhost:3000/api/ai/chat', json=data)
result = response.json()
print(result)
```

**Curl:**

```curl
# AI Chat Completion
curl -X POST "http://localhost:3000/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, how can you help me?","context":{},"options":{}}'
```

**Php:**

```php
<?php
// AI Chat Completion

$data = ['message' => "Hello, how can you help me?", 'context' => [], 'options' => []];
$options = [
    'http' => [
        'header' => "Content-type: application/json\r\n",
        'method' => 'POST',
        'content' => json_encode($data)
    ]
];
$context = stream_context_create($options);
$response = file_get_contents('http://localhost:3000/api/ai/chat', false, $context);
$result = json_decode($response, true);
print_r($result);

```

---

## Memory

### POST /api/memory/store

Store information in the AI memory system

**Request Body:**

```json
{
  "key": "user_preference",
  "value": {},
  "metadata": {}
}
```

**Examples:**

**Javascript:**

```js
// Store Memory
const response = await fetch('http://localhost:3000/api/memory/store', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
  "key": "user_preference",
  "value": {},
  "metadata": {}
})
});
const data = await response.json();
console.log(data);
```

**Python:**

```python
# Store Memory
import requests

data = {
  "key": "user_preference",
  "value": {},
  "metadata": {}
}
response = requests.post('http://localhost:3000/api/memory/store', json=data)
result = response.json()
print(result)
```

**Curl:**

```curl
# Store Memory
curl -X POST "http://localhost:3000/api/memory/store" \
  -H "Content-Type: application/json" \
  -d '{"key":"user_preference","value":{},"metadata":{}}'
```

**Php:**

```php
<?php
// Store Memory

$data = ['key' => "user_preference", 'value' => [], 'metadata' => []];
$options = [
    'http' => [
        'header' => "Content-type: application/json\r\n",
        'method' => 'POST',
        'content' => json_encode($data)
    ]
];
$context = stream_context_create($options);
$response = file_get_contents('http://localhost:3000/api/memory/store', false, $context);
$result = json_decode($response, true);
print_r($result);

```

---

## Tourism

### POST /api/tourism/itinerary

Create a personalized travel itinerary based on preferences

**Request Body:**

```json
{
  "destination": "Slovenia",
  "duration": 7,
  "budget": 1000,
  "interests": [
    "example"
  ]
}
```

**Examples:**

**Javascript:**

```js
// Generate Travel Itinerary
const response = await fetch('http://localhost:3000/api/tourism/itinerary', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
  "destination": "Slovenia",
  "duration": 7,
  "budget": 1000,
  "interests": [
    "example"
  ]
})
});
const data = await response.json();
console.log(data);
```

**Python:**

```python
# Generate Travel Itinerary
import requests

data = {
  "destination": "Slovenia",
  "duration": 7,
  "budget": 1000,
  "interests": [
    "example"
  ]
}
response = requests.post('http://localhost:3000/api/tourism/itinerary', json=data)
result = response.json()
print(result)
```

**Curl:**

```curl
# Generate Travel Itinerary
curl -X POST "http://localhost:3000/api/tourism/itinerary" \
  -H "Content-Type: application/json" \
  -d '{"destination":"Slovenia","duration":7,"budget":1000,"interests":["example"]}'
```

**Php:**

```php
<?php
// Generate Travel Itinerary

$data = ['destination' => "Slovenia", 'duration' => 7, 'budget' => 1000, 'interests' => ['0' => "example"]];
$options = [
    'http' => [
        'header' => "Content-type: application/json\r\n",
        'method' => 'POST',
        'content' => json_encode($data)
    ]
];
$context = stream_context_create($options);
$response = file_get_contents('http://localhost:3000/api/tourism/itinerary', false, $context);
$result = json_decode($response, true);
print_r($result);

```

---

## Hospitality

### POST /api/hospitality/menu

Create optimized restaurant menu with pricing and nutritional information

**Request Body:**

```json
{
  "cuisine": "Mediterranean",
  "budget": 500,
  "dietary": [
    "example"
  ]
}
```

**Examples:**

**Javascript:**

```js
// Generate Restaurant Menu
const response = await fetch('http://localhost:3000/api/hospitality/menu', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
  "cuisine": "Mediterranean",
  "budget": 500,
  "dietary": [
    "example"
  ]
})
});
const data = await response.json();
console.log(data);
```

**Python:**

```python
# Generate Restaurant Menu
import requests

data = {
  "cuisine": "Mediterranean",
  "budget": 500,
  "dietary": [
    "example"
  ]
}
response = requests.post('http://localhost:3000/api/hospitality/menu', json=data)
result = response.json()
print(result)
```

**Curl:**

```curl
# Generate Restaurant Menu
curl -X POST "http://localhost:3000/api/hospitality/menu" \
  -H "Content-Type: application/json" \
  -d '{"cuisine":"Mediterranean","budget":500,"dietary":["example"]}'
```

**Php:**

```php
<?php
// Generate Restaurant Menu

$data = ['cuisine' => "Mediterranean", 'budget' => 500, 'dietary' => ['0' => "example"]];
$options = [
    'http' => [
        'header' => "Content-type: application/json\r\n",
        'method' => 'POST',
        'content' => json_encode($data)
    ]
];
$context = stream_context_create($options);
$response = file_get_contents('http://localhost:3000/api/hospitality/menu', false, $context);
$result = json_decode($response, true);
print_r($result);

```

---

