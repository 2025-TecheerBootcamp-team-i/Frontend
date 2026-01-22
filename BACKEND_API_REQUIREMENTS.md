# 백엔드 API 요청사항

플레이리스트 기능 개선을 위해 백엔드 팀에 다음 API 스펙 확인 및 구현을 요청합니다.

---

## 📌 1. 노래 좋아요 API (현재 구현 중)

### 엔드포인트
```
POST /api/v1/tracks/{music_id}/likes
DELETE /api/v1/tracks/{music_id}/likes
```

### 요청 사항
노래에 좋아요를 누르면 자동으로 해당 사용자의 **"나의 좋아요 목록"** 시스템 플레이리스트에 곡이 추가되어야 합니다.

### 동작 방식
1. 사용자가 `POST /tracks/{music_id}/likes` 호출
2. 백엔드는:
   - 해당 사용자의 시스템 플레이리스트 ("나의 좋아요 목록") 자동 조회
   - 해당 플레이리스트에 `music_id` 곡 추가
   - 좋아요 기록 저장
3. 좋아요 취소 시 (`DELETE`):
   - 시스템 플레이리스트에서 곡 제거
   - 좋아요 기록 삭제

### 응답 예시
```json
{
  "message": "좋아요가 추가되었습니다",
  "music_id": 123,
  "is_liked": true,
  "system_playlist_id": 1
}
```

---

## 📌 2. 플레이리스트 좋아요 API 스펙 확인

### 엔드포인트 (이미 구현됨)
```
POST /api/v1/playlists/{playlist_id}/likes
DELETE /api/v1/playlists/{playlist_id}/likes
```

### 확인 필요 사항

#### ❓ 자신의 플레이리스트에 좋아요를 누를 수 있나요?
- **프론트엔드 구현**: 내가 만든 플레이리스트에는 좋아요 버튼이 표시되지 않음
- **백엔드 검증 필요**: API 레벨에서도 `user_id === playlist.owner_id` 검증이 필요할 수 있음

#### ❓ 시스템 플레이리스트("나의 좋아요 목록")에 좋아요를 누를 수 있나요?
- **프론트엔드 구현**: 시스템 플레이리스트에는 좋아요 버튼이 표시되지 않음
- **백엔드 검증 필요**: `visibility === "system"`인 플레이리스트는 좋아요 불가 처리 권장

---

## 📌 3. 좋아요한 플레이리스트 목록 API

### 엔드포인트 (이미 구현됨)
```
GET /api/v1/playlists/likes
```

### 응답 확인 필요
현재 이 API가 반환하는 데이터에 **시스템 플레이리스트가 포함되나요?**

#### 프론트엔드 기대 동작
- `/playlists/likes` → **내가 좋아요 누른 다른 사람의 플레이리스트만** 반환
- **시스템 플레이리스트 제외** (이미 `/playlists?visibility=private`에 포함됨)

#### 현재 프론트엔드 필터링
```typescript
const likedMapped = likedData
  .filter((p) => p.visibility !== "system") // 시스템 플레이리스트 제외
  .map(mapToPlaylist);
```

### 권장 사항
백엔드에서 `/playlists/likes` 응답에서 시스템 플레이리스트를 제외하여 반환하면 프론트엔드 코드가 더 간결해집니다.

---

## 📌 4. 앨범 좋아요 API (신규 요청)

### 현재 상태
- 앨범 좋아요 기능이 프론트엔드에서 mock 데이터로만 구현되어 있음
- **실제 백엔드 API가 필요합니다**

### 필요한 엔드포인트

#### 4-1. 앨범 좋아요 토글
```
POST /api/v1/albums/{album_id}/likes
DELETE /api/v1/albums/{album_id}/likes
```

**요청 파라미터**
- `album_id`: 앨범 ID (path parameter)

**응답 예시**
```json
{
  "message": "앨범 좋아요가 추가되었습니다",
  "album_id": 456,
  "is_liked": true,
  "like_count": 1234
}
```

#### 4-2. 좋아요한 앨범 목록 조회
```
GET /api/v1/albums/likes
```

**응답 예시**
```json
[
  {
    "album_id": 456,
    "title": "앨범 제목",
    "artist_name": "아티스트 이름",
    "cover_image": "https://...",
    "release_date": "2024-01-01",
    "like_count": 1234,
    "is_liked": true
  }
]
```

---

## 📌 5. 시스템 플레이리스트 생성 로직

### 회원가입 시 자동 생성
사용자가 회원가입하면 자동으로 **"나의 좋아요 목록"** 플레이리스트가 생성되어야 합니다.

### 플레이리스트 속성
```json
{
  "playlist_id": 1,
  "title": "나의 좋아요 목록",
  "visibility": "system",  // ⚠️ 중요: "public"이나 "private"가 아닌 "system"
  "user_id": 123,
  "creator_nickname": "사용자닉네임",
  "item_count": 0,
  "like_count": 0,
  "is_liked": false,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 중요 사항
- `visibility` 필드가 **`"system"`**이어야 프론트엔드에서 시스템 플레이리스트로 인식
- 사용자가 삭제, 수정할 수 없음 (백엔드 검증 필요)
- 제목은 항상 **"나의 좋아요 목록"**으로 고정

---

## 📌 6. 플레이리스트 목록 조회 API 확인

### 엔드포인트
```
GET /api/v1/playlists?visibility=private
```

### 확인 필요 사항
현재 이 API가 **시스템 플레이리스트도 함께 반환**하나요?

#### 프론트엔드 기대 동작
- `visibility=private` 조회 시:
  - 내가 만든 일반 플레이리스트 (private)
  - **+ 시스템 플레이리스트** ("나의 좋아요 목록")
  
모두 함께 반환되어야 "내 플레이리스트" 섹션에 표시됩니다.

---

## 📌 7. 인기 플레이리스트 필터링

### 엔드포인트
```
GET /api/v1/playlists?visibility=public
```

### 현재 프론트엔드 필터링
```typescript
const filtered = data.filter((p) => 
    p.like_count >= 20 && 
    p.visibility !== "system"
);
```

### 권장 사항 (선택)
백엔드에서 시스템 플레이리스트를 애초에 `visibility=public` 응답에 포함하지 않는 것이 좋습니다.
(시스템 플레이리스트는 사용자별로 존재하므로 공개 목록에 포함될 이유가 없음)

---

## 🎯 우선순위

| 순위 | 항목 | 상태 | 중요도 |
|------|------|------|--------|
| 1 | 노래 좋아요 API → 시스템 플레이리스트 자동 추가 | 🔄 구현 중 | ⭐⭐⭐ 높음 |
| 2 | 시스템 플레이리스트 생성 로직 (회원가입 시) | ❓ 확인 필요 | ⭐⭐⭐ 높음 |
| 3 | 좋아요한 플레이리스트 목록에서 시스템 제외 | ❓ 확인 필요 | ⭐⭐ 중간 |
| 4 | 앨범 좋아요 API 구현 | ❌ 미구현 | ⭐⭐ 중간 |
| 5 | 자신의 플레이리스트 좋아요 방지 검증 | ❓ 확인 필요 | ⭐ 낮음 |

---

## 📝 추가 참고사항

### 프론트엔드 타입 정의
백엔드 응답 타입이 다음과 같아야 합니다:

```typescript
interface PlaylistSummary {
  playlist_id: number;
  title: string;
  visibility: "public" | "private" | "system";  // ⚠️ "system" 추가
  user_id: number;
  creator_nickname: string;
  item_count: number;
  like_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
}
```

### 시스템 플레이리스트 제목 상수
프론트엔드에서 사용 중인 상수:
```typescript
export const SYSTEM_LIKED_PLAYLIST_TITLE = "나의 좋아요 목록";
```

백엔드에서도 동일한 제목을 사용해주세요.

---

## 🤝 협업 요청

위 내용 중 확인이나 구현이 필요한 사항이 있으면 팀 채팅이나 이슈 트래커에 공유 부탁드립니다!

특히 다음 항목은 빠른 확인이 필요합니다:
1. ✅ 노래 좋아요 시 시스템 플레이리스트 자동 추가 여부
2. ✅ 회원가입 시 시스템 플레이리스트 자동 생성 여부
3. ✅ `/playlists/likes` API 응답에 시스템 플레이리스트 포함 여부

감사합니다! 🙏
