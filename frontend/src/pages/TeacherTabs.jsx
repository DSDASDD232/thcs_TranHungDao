import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  School, Loader2, Users, CheckSquare, BarChart, Download, Settings, Search,
  Trophy, Calendar, Sparkles, Medal, Eye, Trash2, Filter, Pencil, Image as ImageIcon,
  PenTool, FileText 
} from "lucide-react";

const getRankMedal = (index) => {
  if (index === 0) return <Medal className="w-8 h-8 text-amber-400 drop-shadow-md" fill="currentColor" />;
  if (index === 1) return <Medal className="w-8 h-8 text-slate-300 drop-shadow-md" fill="currentColor" />;
  if (index === 2) return <Medal className="w-8 h-8 text-orange-400 drop-shadow-md" fill="currentColor" />;
  return <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold">{index + 1}</div>;
};

// ==========================================
// 1. TAB QUẢN LÝ LỚP
// ==========================================
export const MyClassesTab = ({ isLoadingData, filteredClasses, allClasses, classStatsMap, isFetchingStats, searchClassQuery, setSearchClassQuery, setIsSelectClassDialogOpen, handleViewStudentList, handleExportClassReport }) => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-sky-950">Tiến độ & Thi đua</h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">Báo cáo tổng quan các lớp thầy/cô đang phụ trách.</p>
      </div>
      <div className="flex gap-3 w-full sm:w-auto flex-col sm:flex-row">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Tìm tên lớp (VD: 6A)..." className="pl-9 h-11 rounded-xl bg-white border-sky-100 font-medium" value={searchClassQuery} onChange={(e) => setSearchClassQuery(e.target.value)} />
        </div>
        <Button onClick={() => setIsSelectClassDialogOpen(true)} className="bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 h-11 px-5 rounded-xl shadow-sm font-bold whitespace-nowrap">
          <Settings className="w-4 h-4 mr-2" /> Thay đổi lớp
        </Button>
      </div>
    </div>

    {isLoadingData ? <div className="text-center py-10"><Loader2 className="w-10 h-10 animate-spin mx-auto text-sky-500"/></div> : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!filteredClasses || filteredClasses.length === 0 ? (
            <div className="col-span-full bg-white border border-dashed border-sky-200 rounded-3xl p-10 sm:p-12 text-center">
              <School className="w-16 h-16 text-sky-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-600 mb-2">Chưa có lớp nào phù hợp</h3>
              <p className="text-slate-400">Hãy thử tìm tên khác hoặc bấm "Thay đổi lớp" để chọn lớp phụ trách.</p>
            </div>
        ) : (
          filteredClasses.map(cls => {
            const classId = cls._id || cls;
            const classObj = allClasses.find(c => c._id === classId) || cls;
            const stats = classStatsMap[classId] || { totalSubmissions: 0, averageScore: 0 };
            
            return (
              <Card key={classId} className="border-sky-100 shadow-sm rounded-3xl bg-white hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                <CardHeader className="border-b border-sky-50 bg-sky-50/30 pb-4 pt-5 px-6">
                  <CardTitle className="flex justify-between items-center">
                    <span className="text-xl sm:text-2xl font-black text-sky-950">{classObj.name || cls.name}</span>
                    <Badge className="bg-sky-100 text-sky-700 shadow-none font-bold">Khối {classObj.grade || cls.grade}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                      <div className="flex items-center text-slate-500"><Users className="w-4 h-4 mr-2"/> Sĩ số</div>
                      <span className="font-black text-slate-700 text-lg">{classObj.studentCount || 0} em</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                      <div className="flex items-center text-slate-500"><CheckSquare className="w-4 h-4 mr-2"/> Làm bài</div>
                      {isFetchingStats ? <Loader2 className="w-4 h-4 animate-spin text-teal-500" /> : <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md text-xs sm:text-sm">{stats.totalSubmissions} lượt</span>}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-slate-500"><BarChart className="w-4 h-4 mr-2"/> ĐTB Lớp</div>
                      {isFetchingStats ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md text-xs sm:text-sm">{stats.averageScore}</span>}
                    </div>
                  </div>
                  <div className="pt-2 flex gap-2">
                    <Button onClick={() => handleViewStudentList(classId, classObj.name || cls.name)} className="flex-1 bg-sky-50 text-sky-600 hover:bg-sky-100 font-bold shadow-none text-xs sm:text-sm">Xem DS</Button>
                    <Button onClick={() => handleExportClassReport(classId, classObj.name || cls.name)} className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-sm text-xs sm:text-sm"><Download className="w-4 h-4 mr-1 sm:mr-2"/> Báo cáo</Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    )}
  </div>
);

// ==========================================
// 2. TAB BẢNG THI ĐUA (ĐÃ BỔ SUNG LỌC MÔN, EXCEL & XEM CHI TIẾT)
// ==========================================
export const LeaderboardTab = ({ 
  leaderboardTimeFilter, setLeaderboardTimeFilter, 
  leaderboardSubjectFilter, setLeaderboardSubjectFilter, // Bổ sung lọc môn
  selectedLeaderboardClass, setSelectedLeaderboardClass, 
  teacherProfile, allClasses, isLoadingLeaderboard, leaderboardData,
  handleExportLeaderboardExcel, // Bổ sung hàm xuất excel
  handleViewStudentDetails // Bổ sung hàm click xem chi tiết
}) => (
  <div className="space-y-6">
    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-sky-100">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-sky-950 flex items-center gap-2"><Trophy className="w-6 h-6 text-amber-500" /> Bảng Xếp Hạng Lớp</h2>
      </div>
      <div className="flex flex-wrap gap-2 w-full xl:w-auto overflow-x-auto pb-2 sm:pb-0">
        
        {/* Bộ lọc Môn học */}
        <Select value={leaderboardSubjectFilter} onValueChange={setLeaderboardSubjectFilter}>
          <SelectTrigger className="h-10 sm:h-12 rounded-xl bg-sky-50 min-w-[120px] border-none font-bold text-sky-800 shadow-sm">
            <Filter className="w-4 h-4 mr-2" />
            <span className="truncate">{!leaderboardSubjectFilter || leaderboardSubjectFilter === 'all' ? 'Tất cả môn' : leaderboardSubjectFilter}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả môn</SelectItem>
            <SelectItem value="Toán">Toán</SelectItem>
            <SelectItem value="Ngữ Văn">Ngữ Văn</SelectItem>
            <SelectItem value="Tiếng Anh">Tiếng Anh</SelectItem>
          </SelectContent>
        </Select>

        {/* Bộ lọc Thời gian */}
        <Select value={leaderboardTimeFilter} onValueChange={setLeaderboardTimeFilter}>
          <SelectTrigger className="h-10 sm:h-12 rounded-xl bg-sky-50 min-w-[120px] border-none font-bold text-sky-800 shadow-sm"><Calendar className="w-4 h-4 mr-2" /><span className="truncate">{leaderboardTimeFilter === 'week' ? 'Tuần này' : leaderboardTimeFilter === 'month' ? 'Tháng này' : leaderboardTimeFilter === 'year' ? 'Năm nay' : 'Tất cả'}</span></SelectTrigger>
          <SelectContent><SelectItem value="all">Tất cả</SelectItem><SelectItem value="week">Tuần này</SelectItem><SelectItem value="month">Tháng này</SelectItem><SelectItem value="year">Năm nay</SelectItem></SelectContent>
        </Select>

        {/* Chọn Lớp */}
        <Select value={selectedLeaderboardClass} onValueChange={setSelectedLeaderboardClass}>
          <SelectTrigger className="h-10 sm:h-12 rounded-xl bg-sky-50 border-none font-bold text-sky-800 shadow-sm min-w-[140px]">
            <span className="truncate">
              {selectedLeaderboardClass ? (() => { const matched = allClasses.find(c => String(c._id) === String(selectedLeaderboardClass)); return matched ? `Lớp ${matched.name}` : "Đang tải..."; })() : "-- Chọn lớp --"}
            </span>
          </SelectTrigger>
          <SelectContent>
            {!teacherProfile?.assignedClasses || teacherProfile.assignedClasses.length === 0 ? (
              <SelectItem value="none" disabled>Bạn chưa quản lý lớp</SelectItem>
            ) : (
              teacherProfile.assignedClasses.map(c => {
                const classId = String(c._id || c);
                const matchedClass = allClasses.find(cls => String(cls._id) === classId);
                return <SelectItem key={classId} value={classId} className="font-bold">Lớp {matchedClass ? matchedClass.name : "Đang tải..."}</SelectItem>
              })
            )}
          </SelectContent>
        </Select>

        {/* Nút Xuất Excel */}
        <Button onClick={handleExportLeaderboardExcel} className="h-10 sm:h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-sm">
          <Download className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Xuất Excel</span>
        </Button>
      </div>
    </div>

    {isLoadingLeaderboard ? (
      <div className="text-center py-20 bg-white rounded-3xl border border-sky-100"><Loader2 className="w-12 h-12 animate-spin mx-auto text-sky-500 mb-4"/></div>
    ) : !selectedLeaderboardClass ? (
      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-sky-200"><Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4" /><p className="text-slate-500 font-medium">Chọn một lớp để xem xếp hạng.</p></div>
    ) : leaderboardData.length === 0 ? (
      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-sky-200"><BarChart className="w-16 h-16 text-slate-200 mx-auto mb-4" /><p className="text-slate-500 font-medium">Chưa có học sinh nào làm bài hoặc chưa khớp bộ lọc.</p></div>
    ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-black text-sky-900 text-lg uppercase flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500"/> Bảng Vàng</h3>
          {leaderboardData.slice(0, 3).map((student, idx) => (
            <Card 
              key={student._id} 
              onClick={() => handleViewStudentDetails(student)} 
              className={`border-none shadow-md rounded-2xl cursor-pointer transition-transform hover:scale-[1.02] ${idx === 0 ? 'bg-gradient-to-br from-amber-100 to-amber-50' : idx === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-100' : 'bg-gradient-to-br from-orange-200 to-orange-100'}`}
            >
              <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">{getRankMedal(idx)}</div><div><p className="font-black text-slate-800 text-lg line-clamp-1">{student.fullName}</p><p className="text-xs font-bold text-slate-500">{student.totalTests} bài</p></div></div>
                  <div className="text-right shrink-0 ml-2"><p className="font-black text-2xl">{student.averageScore}</p><p className="text-[10px] font-black uppercase opacity-60">Điểm TB</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-sky-100 overflow-hidden">
          <div className="bg-sky-50/50 p-4 border-b border-sky-100"><h3 className="font-black text-sky-900">Danh sách toàn lớp</h3></div>
          <div className="max-h-[500px] overflow-x-auto p-2">
            <Table className="min-w-[400px]">
              <TableHeader><TableRow><TableHead className="w-16 text-center">Hạng</TableHead><TableHead>Họ và Tên</TableHead><TableHead className="text-center">Đã làm</TableHead><TableHead className="text-right pr-6">Điểm TB</TableHead></TableRow></TableHeader>
              <TableBody>
                {leaderboardData.map((student, idx) => (
                  <TableRow 
                    key={student._id} 
                    onClick={() => handleViewStudentDetails(student)} 
                    className="cursor-pointer hover:bg-sky-50/50 transition-colors group"
                  >
                    <TableCell className="text-center font-bold text-slate-400 group-hover:text-sky-600">{idx + 1}</TableCell>
                    <TableCell className="font-bold text-slate-700 group-hover:text-sky-700">{student.fullName}</TableCell>
                    <TableCell className="text-center font-medium"><Badge className="bg-sky-100 text-sky-700 border-0 shadow-none hover:bg-sky-200">{student.totalTests}</Badge></TableCell>
                    <TableCell className="text-right pr-6 font-black text-sky-600">{student.averageScore}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    )}
  </div>
);

// ==========================================
// 3. TAB BÀI TẬP ĐÃ GIAO
// ==========================================
export const AssignmentsTab = ({ isLoadingData, assignments, handleDeleteAssignment, handleEditAssignment }) => {
  const navigate = useNavigate();
  return (
    <Card className="border-sky-100/50 shadow-sm rounded-3xl overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader className="bg-sky-50/80">
            <TableRow>
              <TableHead className="pl-4 sm:pl-8 font-bold h-14 text-sky-800">Tên bài tập</TableHead>
              <TableHead className="text-center font-bold text-sky-800">Lớp</TableHead>
              <TableHead className="text-center font-bold text-sky-800">Số câu</TableHead>
              <TableHead className="font-bold text-sky-800">Hạn nộp</TableHead>
              <TableHead className="text-right pr-4 sm:pr-8 font-bold text-sky-800 w-[150px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingData ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin mx-auto text-sky-500 h-10 w-10" /></TableCell></TableRow>
            ) : assignments.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-24 text-slate-400 italic">Chưa có bài tập nào.</TableCell></TableRow>
            ) : (
              assignments.map(assig => (
                <TableRow key={assig._id} className={`transition-colors border-sky-50 ${assig.status === 'draft' ? 'bg-slate-50/50 hover:bg-slate-100/50' : 'hover:bg-sky-50/50'}`}>
                  <TableCell className="pl-4 sm:pl-8">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="font-bold text-sky-700">{assig.title}</span>
                      {assig.status === 'draft' ? (
                        <Badge className="bg-amber-100 text-amber-700 shadow-none border-0 text-[10px] px-2 uppercase py-0 leading-tight h-5">Bản nháp</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 shadow-none border-0 text-[10px] px-2 uppercase py-0 leading-tight h-5">Đã giao</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center"><Badge className="bg-sky-100 text-sky-700 font-bold px-3 shadow-none hover:bg-sky-200">{assig.targetClass}</Badge></TableCell>
                  <TableCell className="font-semibold text-center text-slate-600">{assig.questions?.length || 0}</TableCell>
                  <TableCell className="text-slate-500 text-sm font-medium">{new Date(assig.dueDate).toLocaleString("vi-VN")}</TableCell>
                  <TableCell className="text-right pr-4 sm:pr-8">
                    <div className="flex justify-end gap-1 sm:gap-2">
                      
                      {/* HIỂN THỊ NÚT TƯƠNG ỨNG VỚI STATUS */}
                      {assig.status === 'draft' ? (
                         <Button onClick={() => handleEditAssignment(assig._id)} variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-amber-600 hover:bg-amber-100 rounded-xl" title="Sửa bản nháp">
                           <PenTool className="h-4 w-4" />
                         </Button>
                      ) : (
                         <Button onClick={() => navigate(`/teacher/assignment/${assig._id}/grades`)} variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-sky-600 hover:bg-sky-100 rounded-xl" title="Xem điểm">
                           <FileText className="h-4 w-4" />
                         </Button>
                      )}

                      <Button onClick={() => handleDeleteAssignment(assig._id, assig.title)} variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-rose-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl" title="Xóa bài">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

// ==========================================
// 4. TAB KHO CÂU HỎI
// ==========================================
export const QuestionsTab = ({ searchQuery, setSearchQuery, filterGrade, setFilterGrade, filterSubject, setFilterSubject, filteredQuestions, isLoadingData, serverUrl, handleEditClick, handleDeleteQuestion }) => (
  <>
    <Card className="mb-6 border-none shadow-sm rounded-2xl bg-white p-4">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Tìm câu hỏi..." className="pl-10 rounded-xl bg-slate-50 border-none h-11" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 sm:pb-0">
          <Select value={filterGrade} onValueChange={setFilterGrade}><SelectTrigger className="w-[110px] sm:w-[120px] rounded-xl bg-slate-50 border-none h-11 font-semibold"><Filter className="w-3 h-3 mr-1 sm:mr-2" /><SelectValue placeholder="Khối" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả Khối</SelectItem><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent></Select>
          <Select value={filterSubject} onValueChange={setFilterSubject}><SelectTrigger className="w-[110px] sm:w-[120px] rounded-xl bg-slate-50 border-none h-11 font-semibold"><SelectValue placeholder="Môn" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả Môn</SelectItem><SelectItem value="Toán">Toán</SelectItem><SelectItem value="Ngữ Văn">Ngữ Văn</SelectItem><SelectItem value="Tiếng Anh">Tiếng Anh</SelectItem></SelectContent></Select>
        </div>
      </div>
    </Card>

    <Card className="border-sky-100/50 shadow-xl rounded-3xl overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader className="bg-sky-50/80"><TableRow><TableHead className="pl-4 sm:pl-8 font-bold h-14 w-[40%] sm:w-1/2 text-sky-800">Nội dung</TableHead><TableHead className="font-bold text-center text-sky-800">Khối</TableHead><TableHead className="font-bold text-sky-800">Môn</TableHead><TableHead className="font-bold text-sky-800">Độ khó</TableHead><TableHead className="text-right pr-4 sm:pr-8 font-bold text-sky-800">Thao tác</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoadingData ? <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin mx-auto text-sky-500 h-10 w-10" /></TableCell></TableRow> : filteredQuestions.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-24 text-slate-400 italic">Không tìm thấy câu hỏi.</TableCell></TableRow> : filteredQuestions.map(q => (
              <TableRow key={q._id} className="hover:bg-sky-50/50 transition-colors border-sky-50">
                <TableCell className="pl-4 sm:pl-8 py-4"><div className="flex items-center gap-3">{q.imageUrl ? (<img src={`${serverUrl}${q.imageUrl}`} className="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded-lg border bg-white shadow-sm" />) : (<div className="h-10 w-10 sm:h-12 sm:w-12 bg-slate-50 rounded-lg border border-dashed flex items-center justify-center shrink-0"><ImageIcon className="h-4 w-4 text-slate-300" /></div>)}<span className="font-semibold text-slate-700 line-clamp-2 text-sm sm:text-base">{q.content}</span></div></TableCell>
                <TableCell className="text-center"><Badge variant="outline" className="bg-sky-100 text-sky-700 border-0 font-black px-2 sm:px-3 hover:bg-sky-200 text-xs sm:text-sm">Khối {q.grade || "?"}</Badge></TableCell>
                <TableCell><Badge variant="outline" className="bg-slate-100 text-slate-600 border-0 text-xs sm:text-sm">{q.subject}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={`${q.difficulty === 'easy' ? 'text-teal-600 bg-teal-50' : q.difficulty === 'hard' ? 'text-rose-600 bg-rose-50' : 'text-amber-600 bg-amber-50'} border-0 text-xs sm:text-sm`}>{q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'hard' ? 'Khó' : 'TB'}</Badge></TableCell>
                <TableCell className="text-right pr-4 sm:pr-8">
                    <div className="flex justify-end gap-1 sm:gap-2">
                      <Button onClick={() => handleEditClick(q)} variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-sky-500 hover:bg-sky-100 rounded-xl"><Pencil className="h-4 w-4" /></Button>
                      <Button onClick={() => handleDeleteQuestion(q._id)} variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-rose-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  </>
);