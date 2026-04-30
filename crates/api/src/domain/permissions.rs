use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum RepositoryRole {
    Read,
    Write,
    Admin,
    Owner,
}

impl RepositoryRole {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Read => "read",
            Self::Write => "write",
            Self::Admin => "admin",
            Self::Owner => "owner",
        }
    }

    pub fn can_read(self) -> bool {
        self >= Self::Read
    }

    pub fn can_write(self) -> bool {
        self >= Self::Write
    }

    pub fn can_admin(self) -> bool {
        self >= Self::Admin
    }
}

impl TryFrom<&str> for RepositoryRole {
    type Error = PermissionParseError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "read" => Ok(Self::Read),
            "write" => Ok(Self::Write),
            "admin" => Ok(Self::Admin),
            "owner" => Ok(Self::Owner),
            other => Err(PermissionParseError(other.to_owned())),
        }
    }
}

#[derive(Debug, thiserror::Error)]
#[error("unknown repository role `{0}`")]
pub struct PermissionParseError(String);
