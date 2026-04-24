package com.zettasource.upperzetta
import com.intellij.openapi.fileTypes.LanguageFileType

class UpperZettaFileType : LanguageFileType(UpperZettaLanguage.INSTANCE) {
    override fun getName() = "UpperZetta File"
    override fun getDescription() = "UpperZetta Language File"
    override fun getDefaultExtension() = "uz"
    override fun getIcon() = UpperZettaIcons.FILE
}